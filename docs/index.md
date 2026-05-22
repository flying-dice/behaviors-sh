---
layout: home
title: behaviors-sh — Behaviour Trees for AI Agents
titleTemplate: false
description: Treat agent instructions like the software they are. Clear steps, predictable behavior, real answers when something goes wrong. behaviors-sh is an open-source behaviour-tree runtime for AI agents — exposed over MCP, with a browser canvas to watch a run unfold.

hero:
  name: "behaviors-sh"
  text: '<s>Hoping.</s> <span class="accent">Behaving.</span> <s>Wondering.</s> <span class="accent">Watching.</span>'
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Drive over MCP
      link: /guide/mcp
---

## One instruction at a time

Agents start guessing when they try to do too much. Hide the full plan, ask for a single instruction, and let your agent focus on the present. The agent only ever sees the next step. The plan stays in the tree, not in the prompt.

<div class="attention-split">
  <div class="attention-panel attention-before">
    <div class="attention-tag">CLAUDE.md · 487 lines</div>
    <pre>1. First, check the git status. Confirm a clean tree.
2. Read the existing tests. Note their style.
3. Locate the file containing the function to refactor.
4. Identify single-responsibility violations. Score each.
5. Draft a refactor plan and present to the user.
6. Apply the refactor, splitting concerns into modules.
7. Update the imports across the codebase.
8. Run the test suite. Verify everything stays green.
9. Re-score the codebase against the SRP criteria.
10. Confirm violations resolved. Loop if any remain.
11. Run a multi-agent code review on the diff.
12. Compose a before-vs-after report. Save to disk.
13. ...</pre>
  </div>
  <div class="attention-arrow" aria-hidden="true">→</div>
  <div class="attention-panel attention-after">
    <div class="attention-tag">next_step</div>
    <pre><span class="attention-kind">instruct</span>
<span class="attention-action">Score_SRP</span>
Score the codebase for Single
Responsibility violations. Save
the ranked list to <span class="attention-var">$VAR.violations</span>.</pre>
  </div>
</div>

## Watch the agent work

Never guess where your agent got stuck. The runtime writes a self-contained trace file as it runs; open it in the browser canvas to see exactly which branches fired, what the agent wrote into `$VAR`, and where the cursor sat when it finished.

<TreeSvg src="/example.svg" :height="520" />

Green nodes ran and succeeded, red ran and failed, the pink ring marks the cursor. Click any node in the live viewer to see its evaluate/instruct prompt, the agent's narration, and its reasoning — `$VAR` and `$CONST` references become hoverable badges showing the current value.

## YAML. JSON. TypeScript.

Whether you prefer code first or plain text, the TypeScript DSL gives composability and IDE support; YAML and JSON give a no-tooling approach. They all compile to the same runtime tree.

<DslDemo />

## Drive it over MCP

The runtime is exposed as a Model Context Protocol server (STDIO or Streamable HTTP). Any agent that speaks MCP can drive a tree — Claude Code, Claude Desktop, ChatGPT, your own client. Twelve tools, all URI-addressed: the caller picks where the trace lands, the runtime writes there.

```text
start_execution(tree_uri, trace_output)   → protocol-gate instruct
submit(trace_output, "success")           → gate accepted

next_step(trace_output)                   → instruct | evaluate | done | failure
var_write(trace_output, key, value)       → store an agent output
submit(trace_output, "success")           → advance the action
#  repeat next_step → … → submit until { status: "done" }
```

`next_step` is replay-safe — calling it again mid-step returns the same request unchanged, so a flaky retry doesn't desync the cursor.

## Share with the tools you love

Publish to npm, share through GitHub, ship a YAML file in a gist — the runtime reads from any URI. The runtime never sees the distribution; it just reads the tree at the URI you point it at.

<InstallDemo />

## Hand over to your agent

In Claude Code, the project-scoped `.mcp.json` wires the runtime as an MCP server. The agent gets twelve tools (`mcp__behaviors-sh__next_step`, `…__submit`, `…__var_write`, etc.) and a brief that says "drive this tree". That is the entire human-side interaction.

```text
Drive the tree at file:///abs/path/to/tree.yaml and write the trace to
file:///abs/path/to/run.json. Acknowledge the protocol gate, then loop
next_step → submit/eval until you see { status: "done" }.
```

> For the long-form walkthrough — clone, configure, drive hello-world from Claude — see [Get started](/getting-started).

## From local to fleet

Whether running locally or with a fleet of agents, the engine, DSL, and protocol stay the same.

- ✓ **Core engine** — deterministic execution, one step at a time. Resumable and replayable.
- ✓ **DSL** — author workflows in YAML, JSON, or TypeScript that compile to one tree shape.
- ✓ **STDIO MCP server** — native protocol for local agents; works with Claude Code out of the box.
- ✓ **HTTP MCP server** — host a central runtime any fleet of agents can reach.
- ✓ **Browser canvas viewer** — open a trace file, see the tree light up, inspect every node.

> MCP is the [Model Context Protocol](https://modelcontextprotocol.io/) — the wire format agents already speak.

## Dive in

[Get started](/getting-started) · [Driving over MCP](/guide/mcp) · [View on GitHub](https://gitlab.beluga-sirius.ts.net/flying-dice/behaviors-sh)
