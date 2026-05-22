// Execution document schema — the canonical shape that runtime adapters
// serialize and deserialize. Lives in @behaviors-ui/spec so the runtime,
// the CLI's URI-scheme writers, and any external consumer all reference
// the same source of truth.
//
// See `.claude/skills/todo-tracker/plans/mcp.md` for the design rationale
// (URI-addressed I/O, caller-supplied identifiers, CQRS port split).

import type { ParsedTree } from "./normalized";

// One entry of the execution audit log. Append-only; written after each
// agent decision. The engine ignores `note` — it exists for post-hoc
// inspection of how the agent reasoned through the tree.
export type TraceKind = "evaluate" | "instruct" | "protocol" | "think";

export interface TraceEntry {
	ts: string;
	kind: TraceKind;
	cursor: string;
	name: string;
	submitted: string;
	outcome: string;
	note?: string;
}

export type NodeStatus = "success" | "failure" | "running";

// Internal engine bookkeeping. Keys are dot-joined node paths (e.g.
// "0.1.2") used as flat dictionary keys, not walked.
export interface RuntimeState {
	node_status: Record<string, NodeStatus>;
	step_index: Record<string, number>;
	retry_count: Record<string, number>;
}

export const EXECUTION_SCHEMA_VERSION = 1 as const;

// Top-level lifecycle. Transitions:
//   running  →  complete   (tree returned `done`)
//   running  →  failed     (tree returned `failure`, or protocol rejected)
// `reset_execution` returns a doc to `running`.
export type ExecutionStatus = "running" | "complete" | "failed";

// Phase machine for the agent-driving protocol. `next_step` returns the
// same request on repeated calls while phase ∈ { evaluating, performing,
// protocol } — only `eval` / `submit` advance. Transitions:
//   idle        →  evaluating | performing | protocol   (via next_step)
//   evaluating  →  idle                                 (via eval)
//   performing  →  idle                                 (via submit success/failure)
//   protocol    →  idle                                 (via submit on protocol gate)
export type ExecutionPhase = "idle" | "evaluating" | "performing" | "protocol";

export interface ExecutionDocument {
	// Caller-supplied URI that addresses this execution. Equals the
	// `traceOutput` argument passed to `start_execution`. The system
	// never mints this — it is whatever the caller provided.
	uri: string;
	schema_version: typeof EXECUTION_SCHEMA_VERSION;
	created_at: string;
	updated_at: string;

	// The original tree URI the caller passed to `start_execution`.
	// Retained so a moved doc remembers where its tree came from.
	tree_uri: string;
	// Resolved + normalized tree, frozen at create. Stored inline so
	// `resume_execution` can rehydrate without re-fetching the tree.
	tree: ParsedTree;

	status: ExecutionStatus;
	phase: ExecutionPhase;
	cursor: string;
	// Acknowledgement of the runtime protocol. Until true, `next_step`
	// emits the Acknowledge_Protocol gate instruct instead of ticking
	// the tree.
	protocol_accepted: boolean;

	// Mutable scope. `var` is read/write throughout the run.
	var: Record<string, unknown>;
	// Seeded from `tree.state.const` at create; never mutated after.
	const: Record<string, unknown>;

	runtime: RuntimeState;

	// Append-only audit log. Empty at create; cleared on reset.
	trace: TraceEntry[];
}
