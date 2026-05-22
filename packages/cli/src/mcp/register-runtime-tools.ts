// MCP tool registration over a `Runtime`.
//
// Shared between the STDIO and HTTP transports. Tool handlers are
// 2–4 line shims over the `core*` verbs in `verbs.ts`; everything is
// URI-addressed (callers supply both the tree URI and the execution
// URI). The driving protocol mirrors abtree: `next_step` is
// replay-safe, `eval` advances on true / fails on false, `submit`
// advances-or-completes on success and fails on failure, `running`
// yields. Scopes are read/written through dedicated tools — agents
// never substitute state from their own context.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
	EXECUTION_SCHEMA_VERSION,
	INITIAL_CURSOR,
	type Runtime,
} from '@behaviors-sh/runtime'
import { z } from 'zod'
import {
	coreConstRead,
	coreEval,
	coreNext,
	coreReset,
	coreSubmit,
	coreThink,
	coreVarRead,
	coreVarWrite,
} from './verbs.ts'

function textResult(value: unknown) {
	const text = JSON.stringify(value, null, 2)
	return {
		content: [{ type: 'text' as const, text }],
	}
}

function errorResult(message: string) {
	return {
		content: [{ type: 'text' as const, text: message }],
		isError: true,
	}
}

function run<T>(fn: () => T): ReturnType<typeof textResult> {
	try {
		return textResult(fn())
	} catch (err) {
		return errorResult((err as Error).message)
	}
}

async function runAsync<T>(
	fn: () => Promise<T>,
): Promise<ReturnType<typeof textResult>> {
	try {
		return textResult(await fn())
	} catch (err) {
		return errorResult((err as Error).message)
	}
}

const traceOutputField = z
	.string()
	.describe('URI of the execution (e.g. `memory://my-run`, `file:///…/run.json`).')

const scopePathField = z
	.string()
	.min(1)
	.describe('Dotted path inside the scope (e.g. `greeting`).')

const noteField = z
	.string()
	.trim()
	.min(1)
	.optional()
	.describe(
		'Optional one-sentence justification of this decision — name the values that drove it. Recorded on the trace entry.',
	)

export function registerRuntimeTools(
	server: McpServer,
	runtime: Runtime,
): void {
	// ── Lifecycle ───────────────────────────────────────────────────────

	server.registerTool(
		'start_execution',
		{
			title: 'Start execution',
			description:
				'Start a new behaviour-tree execution. Reads the tree from `tree_uri` (file:// supported), embeds the resolved tree into a fresh execution document at `trace_output`, and returns the new document\'s identity. Fails if `trace_output` already addresses an existing execution — use `resume_execution` to continue an existing run.',
			inputSchema: {
				tree_uri: z
					.string()
					.describe(
						'URI of the tree file to execute, e.g. `file:///abs/path/tree.yaml`.',
					),
				trace_output: traceOutputField,
			},
		},
		async ({ tree_uri, trace_output }) =>
			runAsync(async () => {
				const loaded = await runtime.loadTree(tree_uri)
				if (!loaded) throw new Error(`Could not load tree at ${tree_uri}`)
				const now = new Date().toISOString()
				const doc = runtime.executionStore.create({
					uri: trace_output,
					tree_uri,
					tree: loaded.parsed,
					status: 'running',
					phase: 'idle',
					cursor: INITIAL_CURSOR,
					// Protocol gate is bound the moment the doc is created;
					// the first `next_step` returns the Acknowledge_Protocol
					// instruct until the agent submits success.
					protocol_accepted: false,
					created_at: now,
					updated_at: now,
				})
				return {
					ok: true,
					schema_version: EXECUTION_SCHEMA_VERSION,
					uri: doc.uri,
					tree_uri: doc.tree_uri,
					slug: loaded.slug,
				}
			}),
	)

	server.registerTool(
		'resume_execution',
		{
			title: 'Resume execution',
			description:
				'Confirm an existing execution can be resumed from its `trace_output` URI. The tree is read from the embedded snapshot — no `tree_uri` is needed.',
			inputSchema: { trace_output: traceOutputField },
		},
		({ trace_output }) =>
			run(() => {
				const doc = runtime.executionStore.findByUri(trace_output)
				if (!doc) throw new Error(`Execution not found: ${trace_output}`)
				return {
					ok: true,
					uri: doc.uri,
					status: doc.status,
					phase: doc.phase,
					protocol_accepted: doc.protocol_accepted,
				}
			}),
	)

	server.registerTool(
		'reset_execution',
		{
			title: 'Reset execution',
			description:
				'Reset an execution to its initial state — clears the trace, restores scopes from the embedded tree\'s `state`, zeroes runtime bookkeeping, and re-arms the protocol gate. Idempotent.',
			inputSchema: { trace_output: traceOutputField },
		},
		({ trace_output }) => run(() => coreReset(runtime, trace_output)),
	)

	// ── Loop verbs ──────────────────────────────────────────────────────

	server.registerTool(
		'next_step',
		{
			title: 'Get next step',
			description:
				'Get the next request from the execution loop — an `evaluate`, an `instruct`, or a terminal `{ status: "done" | "failure" }`. Replay-safe: if a step is already in flight, returns the same request unchanged. The first call on a fresh execution returns the protocol-gate instruct; submit success to it before any tree work is surfaced.',
			inputSchema: { trace_output: traceOutputField },
		},
		({ trace_output }) => run(() => coreNext(runtime, trace_output)),
	)

	server.registerTool(
		'eval',
		{
			title: 'Submit evaluate result',
			description:
				'Submit the outcome of an `evaluate` step as a boolean. `true` advances to the next step of the action; `false` marks the action a failure (parent retries may still rescue it).',
			inputSchema: {
				trace_output: traceOutputField,
				result: z
					.boolean()
					.describe(
						'Evaluation outcome — true to advance, false to fail the action.',
					),
				note: noteField,
			},
		},
		({ trace_output, result, note }) =>
			run(() => coreEval(runtime, trace_output, result, note)),
	)

	server.registerTool(
		'submit',
		{
			title: 'Submit instruct outcome',
			description:
				'Submit the outcome of an `instruct` step. `success` advances within the action and closes it on the last step; `failure` fails the action; `running` is a yield — appends a trace entry but leaves the cursor in place so the same instruct can be picked up later via `next_step`.',
			inputSchema: {
				trace_output: traceOutputField,
				status: z
					.enum(['success', 'failure', 'running'])
					.describe(
						'Outcome of the current instruct. `running` keeps the cursor in place.',
					),
				note: noteField,
			},
		},
		({ trace_output, status, note }) =>
			run(() => coreSubmit(runtime, trace_output, status, note)),
	)

	server.registerTool(
		'think',
		{
			title: 'Record a checkpoint thought',
			description:
				'Append a checkpoint thought to the trace without advancing the cursor. Use only for long-running instructs at substantive checkpoints — never inside evaluates, never for short instructs.',
			inputSchema: {
				trace_output: traceOutputField,
				thought: z
					.string()
					.trim()
					.min(1)
					.describe(
						'One-line checkpoint thought. Captures progress mid-action — e.g. "tests green", "found candidate", "switching approach because Z".',
					),
			},
		},
		({ trace_output, thought }) =>
			run(() => coreThink(runtime, trace_output, thought)),
	)

	// ── Scope I/O ───────────────────────────────────────────────────────

	server.registerTool(
		'var_read',
		{
			title: 'Read $VAR',
			description:
				'Read from $VAR. Omit `path` to read the entire scope; supply `path` to read one slot.',
			inputSchema: {
				trace_output: traceOutputField,
				path: scopePathField.optional().describe('Optional path inside $VAR.'),
			},
		},
		({ trace_output, path }) =>
			run(() => coreVarRead(runtime, trace_output, path)),
	)

	server.registerTool(
		'var_write',
		{
			title: 'Write to $VAR',
			description:
				'Write a value to $VAR. The string is JSON-parsed when possible (so `"42"` and `42` both work); otherwise stored as a string literal.',
			inputSchema: {
				trace_output: traceOutputField,
				path: scopePathField,
				value: z
					.string()
					.describe(
						'Value to write. JSON-parsed if it parses; otherwise stored as a string literal.',
					),
			},
		},
		({ trace_output, path, value }) =>
			run(() => coreVarWrite(runtime, trace_output, path, value)),
	)

	server.registerTool(
		'const_read',
		{
			title: 'Read $CONST',
			description:
				'Read from $CONST. Omit `path` to read the entire scope; supply `path` to read one slot. $CONST is seeded from the tree\'s `state.const` at create and never mutated thereafter.',
			inputSchema: {
				trace_output: traceOutputField,
				path: scopePathField
					.optional()
					.describe('Optional path inside $CONST.'),
			},
		},
		({ trace_output, path }) =>
			run(() => coreConstRead(runtime, trace_output, path)),
	)

	// ── Read-only inspection ────────────────────────────────────────────

	server.registerTool(
		'get_execution',
		{
			title: 'Get execution',
			description:
				'Return the full execution document at `trace_output` (state, cursor, scopes, runtime bookkeeping, trace).',
			inputSchema: { trace_output: traceOutputField },
		},
		({ trace_output }) =>
			run(() => {
				const doc = runtime.executionStore.findByUri(trace_output)
				if (!doc) throw new Error(`Execution not found: ${trace_output}`)
				return doc
			}),
	)

	server.registerTool(
		'read_trace',
		{
			title: 'Read trace',
			description:
				'Return the append-only trace for an execution. Optionally slice via `from` / `to` (0-based, half-open).',
			inputSchema: {
				trace_output: traceOutputField,
				from: z.int().nonnegative().optional(),
				to: z.int().nonnegative().optional(),
			},
		},
		({ trace_output, from, to }) =>
			run(() => {
				const doc = runtime.executionStore.findByUri(trace_output)
				if (!doc) throw new Error(`Execution not found: ${trace_output}`)
				return doc.trace.slice(from ?? 0, to ?? doc.trace.length)
			}),
	)
}
