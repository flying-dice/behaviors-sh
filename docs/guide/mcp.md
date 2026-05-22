---
title: Driving over MCP
description: behaviors-sh exposes the runtime as a Model Context Protocol server (STDIO + Streamable HTTP). Twelve tools, URI-addressed, replay-safe — drive a behaviour tree end-to-end from Claude Code, Claude Desktop, or any MCP client.
---

# Driving over MCP

The runtime is exposed as a Model Context Protocol server. Agents that speak MCP drive an execution through structured tool calls — no shell parsing, no per-step subprocess spawn, typed input/output schemas.

Two transports are built in:

- **STDIO** — the agent spawns the server on demand. Used by Claude Code, Claude Desktop, and any client that supports stdio servers. See [Registering an MCP client](/guide/mcp-clients).
- **Streamable HTTP** — the server outlives the agent. Used by fleets, multi-process setups, or any case where a central runtime owns the trace store.

```sh
npx -y @behaviors-sh/cli mcp                       # STDIO on stdin/stdout
npx -y @behaviors-sh/cli mcp --http --port 3001    # Streamable HTTP at POST /mcp
```

The same tool surface drives both. `registerRuntimeTools(server, runtime)` is shared; the transports are thin wrappers over the same verbs.

## The phase machine

Every execution lives in one of four phases:

| Phase | Meaning |
| --- | --- |
| `idle` | No step in flight. `next_step` will tick the engine and surface the next request. |
| `evaluating` | An `evaluate` step is open. The agent must answer with `eval(true|false)`. |
| `performing` | An `instruct` step is open. The agent must answer with `submit(success|failure|running)`. |
| `protocol` | A fresh execution is gated on the `Acknowledge_Protocol` instruct. `submit(success)` to accept. |

`next_step` is **replay-safe**: while phase ∈ {`evaluating`, `performing`, `protocol`}, calling it again returns the same request unchanged. Only `eval` / `submit` move the cursor. A flaky retry on the agent side can re-`next_step` without desyncing.

## The twelve tools

All tools are URI-addressed — the caller picks where the trace lands (`trace_output`) and the runtime writes there. The system never mints identifiers; the URI **is** the execution handle.

### Lifecycle

| Tool | Purpose |
| --- | --- |
| `start_execution(tree_uri, trace_output)` | Start a new execution. Reads the tree from `tree_uri` (file://), embeds it into a fresh document at `trace_output`. Fails if the trace URI already exists — use `resume_execution`. |
| `resume_execution(trace_output)` | Confirm an existing execution can be driven. The tree is read from the embedded snapshot — no `tree_uri` needed. |
| `reset_execution(trace_output)` | Rewind: clear trace, restore scopes from the tree's `state`, re-arm the protocol gate. Idempotent. |

### Loop

| Tool | Purpose |
| --- | --- |
| `next_step(trace_output)` | Returns the next `evaluate` / `instruct` / `done` / `failure`. Replay-safe. |
| `eval(trace_output, result, note?)` | Answer an evaluate. `true` advances the step; `false` fails the action. |
| `submit(trace_output, status, note?)` | Answer an instruct. `success` advances; `failure` fails the action; `running` is a yield (cursor stays in place). |
| `think(trace_output, thought)` | Append a checkpoint thought without moving the cursor. Use for long-running instructs at substantive checkpoints. |

### Scope

| Tool | Purpose |
| --- | --- |
| `var_read(trace_output, path?)` | Read [`$VAR`](/concepts/state) — the per-execution blackboard. Omit `path` for the whole scope. |
| `var_write(trace_output, path, value)` | Write `$VAR`. Value is JSON-parsed when possible; otherwise stored as a string. |
| `const_read(trace_output, path?)` | Read [`$CONST`](/concepts/state) — the read-only world model. Seeded once at create from `tree.state.const`; never mutated. |

### Inspection

| Tool | Purpose |
| --- | --- |
| `get_execution(trace_output)` | Return the full execution document. |
| `read_trace(trace_output, from?, to?)` | Slice the append-only trace. |

## Worked example

```text
1. start_execution(
     tree_uri:     "file:///abs/path/to/hello-world.json",
     trace_output: "file:///abs/path/to/run.json",
   )

2. next_step(trace_output)
   → { type: "instruct", name: "Acknowledge_Protocol", … }
   submit(trace_output, "success")

3. next_step(trace_output)
   → { type: "instruct", name: "Determine_Time", … }
   var_write(trace_output, "Hello_World__time_of_day", "\"morning\"")
   submit(trace_output, "success")

4. next_step(trace_output)
   → { type: "evaluate", name: "Morning_Greeting", … }
   eval(trace_output, true)

… and so on until { status: "done" }.
```

Three tool calls per action in the worst case — `next_step` + (`var_read` and/or `var_write`) + (`submit` or `eval`). The agent only ever sees the next request.

## Limitations

- **No `list_*` tools.** behaviors-sh is path-driven by design. The runtime never enumerates trees or executions; the caller always names what it wants. The Executions UI uses a file picker, not an API.
- **Each HTTP request is a fresh `McpServer`.** The SDK rejects reuse of a stateless transport. The `Runtime` itself is shared across requests so URI-keyed state survives.
- **No prompt surface.** The execution protocol is delivered as the `Acknowledge_Protocol` instruct on the first `next_step` — the agent gets primed by the normal flow.

## Next

- [Inspecting executions](/guide/inspecting-executions) — open the trace in the canvas viewer.
- [Writing trees](/guide/writing-trees) — author a tree the agent will drive.
