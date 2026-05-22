<h1 align="center">behaviors-sh</h1>

<p align="center">
  <strong>Behaviour-tree runtime for AI agents — with a canvas to watch them work.</strong><br/>
  Author a tree, drive it through MCP, open the trace in the browser. Treat agent
  instructions like the software they are.
</p>

<p align="center">
  <a href="https://abtree.sh">Concepts</a> ·
  <a href="https://abtree.sh/getting-started">Getting started</a> ·
  <a href=".claude/skills/todo-tracker/plans/mcp.md">MCP design notes</a>
</p>

---

## What it does

behaviors-sh is the next iteration of [abtree](https://github.com/flying-dice/abtree). Same well-tested loop (replay-safe `next_step`, protocol gate, `eval` / `submit` / `think`, `var_read` / `var_write` / `const_read`), repackaged around a URI-addressed I/O model and shipped with a real execution viewer instead of a directory of trace files you have to grep.

The runtime is exposed as a Model Context Protocol server (STDIO or Streamable HTTP); any agent that speaks MCP can drive a tree. Every step the agent took, every value it wrote, every branch it skipped lands in a self-contained trace file you can re-open later in the browser.

## Read the docs

Concepts, the runtime protocol, and the tree-authoring guide live at **[abtree.sh](https://abtree.sh)** — the loop semantics are identical. The differences specific to behaviors-sh (URI-addressed I/O, the executions canvas, the MCP-native surface) are written up in [`plans/mcp.md`](.claude/skills/todo-tracker/plans/mcp.md).

→ Open this repo in Claude Code; the `.mcp.json` registers the runtime as a project-scoped server.
