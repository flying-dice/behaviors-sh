# behaviors-sh

**Behaviour-tree runtime for AI agents — with a canvas to watch them work.**

Author a tree as YAML, JSON, or compile it from the TypeScript DSL. Drive it through MCP from any agent that speaks the protocol. Every step the agent took, every value it wrote, every branch it skipped lands in a self-contained trace file you can re-open later in the in-browser canvas viewer.

This is the next iteration of [abtree](https://github.com/flying-dice/abtree) — same well-tested loop semantics (replay-safe `next_step`, protocol gate, `eval` / `submit` / `think`), repackaged around a URI-addressed I/O model and shipped with a real execution viewer instead of a directory full of trace files you have to grep.

---

## Drive an agent

The CLI exposes the runtime as a Model Context Protocol server (STDIO or Streamable HTTP). Twelve tools, all URI-addressed — the caller picks where the trace lands and the runtime writes there. The system never mints identifiers; the trace file URI is the execution handle.

```text
start_execution(tree_uri, trace_output)   → protocol-gate instruct
submit(trace_output, "success")           → gate accepted

next_step(trace_output)                   → instruct | evaluate | done | failure
var_write(trace_output, key, value)       → store an agent output
submit(trace_output, "success")           → advance the action
#  repeat next_step → … → submit until { status: "done" }
```

Full surface: `start_execution`, `resume_execution`, `reset_execution`, `next_step`, `eval`, `submit`, `think`, `var_read`, `var_write`, `const_read`, `get_execution`, `read_trace`.

`next_step` is replay-safe: while the runtime is mid-`evaluating` / mid-`performing`, calling it again returns the same request instead of advancing. Only `eval` / `submit` move the cursor.

## Watch them work

```sh
bun install
bun run cli            # opens the desktop UI (webview)
bun run dev:client     # or dev-server the client at :5173
```

Click **Executions** in the activity bar, then **Open trace file** and pick any `*.json` written by the runtime. The tree renders as a canvas with status-coloured borders (emerald for success, red for failure, amber-pulsing for the in-flight cursor). A resizable inspector on the right shows, per-node:

- the tree's original `instruct` / `evaluate` text the agent was answering,
- the agent's narration of what it did,
- the agent's `note` (its reasoning),
- inline `$VAR.x` / `$CONST.y` references as hoverable badges that surface the live value.

A separate **State** tab inspects the live `$VAR` / `$CONST` scopes with type-aware rendering; **Engine** tab shows the tick engine's per-node bookkeeping (status, step index, retry count).

## With Claude Code

The `.mcp.json` in this repo registers the runtime as a project-scoped MCP server. Restart Claude Code in this directory; the twelve tools appear as `mcp__behaviors-sh__*`. Then just ask Claude to drive a tree.

A hello-world tree lives at `trees/hello-world/`. To materialise it from the DSL and drive it end-to-end without an agent (useful for development):

```sh
bun packages/cli/scripts/run-hello.ts
```

This writes the resolved tree to `.behaviors-sh/trees/hello-world.json` and an execution document to `.behaviors-sh/executions/hello-world-<stamp>.json` — open that file in the UI.

## Project layout

| Package                  | What                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `@behaviors-sh/spec`     | Zod schemas for trees, workspaces, execution documents. Single source of truth across the workspace.         |
| `@behaviors-sh/runtime`  | Tick engine + hexagonal ports (TreeReader / ExecutionReader / ExecutionWriter). Storage-backend agnostic.    |
| `@behaviors-sh/dsl`      | TypeScript DSL: `sequence`, `selector`, `parallel`, `action`, `evaluate`, `instruct`, `variable`, `constant`. |
| `@behaviors-sh/cli`      | `behaviors-sh` binary — webview, headless server, or MCP transport (`behaviors-sh mcp [--http]`).             |
| `@behaviors-sh/server`   | Hono HTTP layer for the desktop UI.                                                                          |
| `@behaviors-sh/client`   | Svelte 5 frontend: tree designer, marketplace, executions viewer.                                            |
| `trees/*`                | Example tree packages (`hello-world`, `refine-plan`, `code-review`, `clean-code-review`).                    |

## Design notes

- **URIs in, URIs out.** Trees and traces are addressed by URI (`file://`, `memory://`). Scheme-routing readers/writers live in `packages/cli/src/mcp/io/`; HTTP and S3 schemes are a `.register()` call away. There is no discovery / list API by design — the user opens trace files via a file picker, the same way they open workspaces.
- **CQRS-style port split.** `ExecutionReader` and `ExecutionWriter` are separate ports so at scale read replicas, caches, and write-side consistency models don't have to share an implementation. `appendTrace` is a dedicated fast-path so per-tick writes don't rewrite the whole document.
- **Protocol gate.** Fresh executions start with `protocol_accepted: false`. The first `next_step` returns a synthetic `Acknowledge_Protocol` instruct describing the loop. Until the agent submits success to it, no tree work is surfaced.

Full design write-up: [`.claude/skills/todo-tracker/plans/mcp.md`](.claude/skills/todo-tracker/plans/mcp.md).

## Status

Early. The runtime, MCP surface (STDIO + HTTP), and executions UI work end-to-end; 76 tests pass across spec / runtime / cli. Nothing's been published to a registry yet — clone + `bun install` for now.

## See also

- [abtree](https://github.com/flying-dice/abtree) — the predecessor. behaviors-sh ports the well-tested loop semantics and adds the canvas viewer, MCP-native surface, and URI-addressed I/O model.
