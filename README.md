<h1 align="center">behaviors-sh</h1>

<p align="center">
  <strong>Behaviour-tree runtime for AI agents — with a canvas to watch them work.</strong><br/>
  Author a tree, drive it through MCP, open the trace in the browser. Treat agent
  instructions like the software they are.
</p>

<p align="center">
  <a href="./docs/getting-started.md">Get started</a> ·
  <a href="./docs/guide/mcp.md">Driving over MCP</a> ·
  <a href="./docs/guide/inspecting-executions.md">Inspecting executions</a> ·
  <a href=".claude/skills/todo-tracker/plans/mcp.md">Design notes</a>
</p>

---

## What it does

behaviors-sh is a deterministic runtime for agent workflows. Author trees as YAML, JSON, or compile them from the TypeScript DSL. The runtime is exposed as a Model Context Protocol server — STDIO for local agents, Streamable HTTP for fleets — and twelve URI-addressed tools (`next_step`, `eval`, `submit`, `think`, `var_read` / `var_write` / `const_read`, plus the lifecycle quartet) drive a tree end-to-end.

Every step the agent took, every value it wrote, every branch it skipped lands in a self-contained trace file. Open it in the browser canvas to see exactly what ran, with status-coloured nodes and a per-node inspector for the LLM's reasoning.

## Read the docs

The full site lives under [`docs/`](./docs) (VitePress). Run it locally:

```sh
bun install
bun run docs:dev
```

→ Open this repo in Claude Code; the `.mcp.json` registers the runtime as a project-scoped server.
