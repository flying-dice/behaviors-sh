// End-to-end smoke test for the HTTP MCP transport: boots the server,
// performs an MCP initialize handshake + a tools/list + a tools/call
// against the in-memory execution store, and verifies the run survives
// a real HTTP round-trip.

import {
	mkdirSync,
	mkdtempSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { runHttpMcp, type RunningHttpMcp } from '../src/mcp/http.ts'

const PROTOCOL_VERSION = '2025-06-18'

let tmp: string
let server: RunningHttpMcp
let treeUri: string
let sessionId: string | null = null

beforeAll(async () => {
	tmp = realpathSync(mkdtempSync(join(tmpdir(), 'behaviors-sh-mcp-http-')))
	const executionsDir = join(tmp, 'executions')
	mkdirSync(executionsDir)

	const treePath = join(tmp, 'tree.json')
	writeFileSync(
		treePath,
		JSON.stringify({
			type: 'action',
			name: 'Solo',
			steps: [{ instruct: 'do the thing' }],
		}),
	)
	treeUri = pathToFileURL(treePath).href

	server = await runHttpMcp({ port: 0, executionsDir, cwd: tmp })
})

afterAll(async () => {
	await server.stop()
	rmSync(tmp, { recursive: true, force: true })
})

async function rpc(body: unknown): Promise<{ status: number; data: unknown }> {
	const headers: Record<string, string> = {
		'content-type': 'application/json',
		// Both response types must be in Accept for Streamable HTTP transport.
		accept: 'application/json, text/event-stream',
		'mcp-protocol-version': PROTOCOL_VERSION,
	}
	if (sessionId) headers['mcp-session-id'] = sessionId
	const res = await fetch(`${server.url}/mcp`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
	})
	const sid = res.headers.get('mcp-session-id')
	if (sid) sessionId = sid
	const text = await res.text()
	const data = text ? JSON.parse(text) : null
	return { status: res.status, data }
}

describe('mcp http transport', () => {
	test('GET /health responds 200', async () => {
		const res = await fetch(`${server.url}/health`)
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body).toEqual({ ok: true })
	})

	test('initialize handshake succeeds', async () => {
		const { status, data } = await rpc({
			jsonrpc: '2.0',
			id: 1,
			method: 'initialize',
			params: {
				protocolVersion: PROTOCOL_VERSION,
				clientInfo: { name: 'cli-test', version: '0.0.0' },
				capabilities: {},
			},
		})
		expect(status).toBe(200)
		expect(data).toMatchObject({
			jsonrpc: '2.0',
			id: 1,
			result: { serverInfo: { name: 'behaviors-sh' } },
		})
	})

	test('tools/list returns the runtime tool surface', async () => {
		const { status, data } = await rpc({
			jsonrpc: '2.0',
			id: 2,
			method: 'tools/list',
			params: {},
		})
		expect(status).toBe(200)
		const result = (data as { result?: { tools?: { name: string }[] } }).result
		const names = (result?.tools ?? []).map((t) => t.name).sort()
		expect(names).toEqual([
			'const_read',
			'eval',
			'get_execution',
			'next_step',
			'read_trace',
			'reset_execution',
			'resume_execution',
			'start_execution',
			'submit',
			'think',
			'var_read',
			'var_write',
		])
	})

	test('next_step gates on the protocol then drives a tree to done', async () => {
		const traceOutput = 'memory://http-smoke'
		let id = 3

		const callTool = async (name: string, args: Record<string, unknown>) => {
			const res = await rpc({
				jsonrpc: '2.0',
				id: id++,
				method: 'tools/call',
				params: { name, arguments: args },
			})
			expect(res.status).toBe(200)
			const text = (
				res.data as { result: { content: { text: string }[] } }
			).result.content[0]!.text
			return JSON.parse(text)
		}

		const start = await callTool('start_execution', {
			tree_uri: treeUri,
			trace_output: traceOutput,
		})
		expect(start).toMatchObject({ ok: true, uri: traceOutput })

		// First next_step must be the protocol gate, not a tree step.
		const gate = await callTool('next_step', { trace_output: traceOutput })
		expect(gate).toMatchObject({ type: 'instruct', name: 'Acknowledge_Protocol' })

		// Re-asking is idempotent.
		const gateReplay = await callTool('next_step', { trace_output: traceOutput })
		expect(gateReplay).toMatchObject({ name: 'Acknowledge_Protocol' })

		// Accept the protocol.
		const accept = await callTool('submit', {
			trace_output: traceOutput,
			status: 'success',
			note: 'understood',
		})
		expect(accept).toMatchObject({ status: 'protocol_accepted' })

		// Now we see the actual tree's instruct.
		const step = await callTool('next_step', { trace_output: traceOutput })
		expect(step).toMatchObject({
			type: 'instruct',
			name: 'Solo',
			instruction: 'do the thing',
		})

		// Submit success → action closes (single-step action) → next is done.
		const done = await callTool('submit', {
			trace_output: traceOutput,
			status: 'success',
		})
		expect(done).toMatchObject({ status: 'action_complete' })

		const terminal = await callTool('next_step', { trace_output: traceOutput })
		expect(terminal).toEqual({ status: 'done' })
	})

	test('unknown route returns 404', async () => {
		const res = await fetch(`${server.url}/does-not-exist`)
		expect(res.status).toBe(404)
	})
})
