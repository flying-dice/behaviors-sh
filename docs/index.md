---
layout: home
title: behaviors-sh — Behaviour Trees for AI Agents and Agentic Workflows
titleTemplate: false
description: Treat agent instructions like the software they are. Clear steps, predictable behavior, real answers when something goes wrong. behaviors-sh is an open-source runtime for AI agents — deterministic, durable, resumable, and exposed over MCP so any agent that speaks the protocol can drive it.

hero:
  name: "behaviors-sh"
  text: '<s>Hoping.</s> <span class="accent">Behaving.</span>'
  image:
    src: /mark.svg
    alt: behaviors-sh
  actions:
    - theme: brand
      text: Open the builder
      link: https://app.behaviors.sh
    - theme: alt
      text: Get started
      link: /getting-started
    - theme: alt
      text: How it works
      link: /guide/mcp
---

## One instruction at a time

Agents start guessing when they try to do too much. Hide the full plan, ask for a single instruction, and allow your agent to focus on the present. The agent only ever sees the next step. The plan stays in the tree, not in the prompt.

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

## Observability built in

Never guess where your agent got stuck. The runtime shows the tree in real time, logging each step. So you can see exactly what ran, what was skipped, and how far it got.

<TreeSvg src="/example.svg" :height="520" />

Build, edit, and replay your trees on this same canvas at **[app.behaviors.sh](https://app.behaviors.sh)** — no install, nothing to clone.

## YAML. JSON. TypeScript.

Whether you prefer code first or plain text, the TypeScript DSL gives composability and IDE support; YAML and JSON give a no tooling approach.

<DslDemo />

## Share with the tools you love

Publish to npm, share through GitHub or bring your own tooling.

<InstallDemo />

## Hand over to your agent

With the MCP server registered once, every workflow is a single brief. Paste it.

```text
Refactor the worst SRP violation in src/ using the tree at
./.behaviors-sh/trees/srp-refactor.json.
Trace to ./.behaviors-sh/runs/srp.json.
```

The agent resolves the tree, walks the loop to completion, and writes the trace to disk. Re-open it in the [executions viewer](/guide/inspecting-executions) when it's done.

> First time? See [Get started](/getting-started) — register the MCP server, materialise your first tree, drive it.

## From local to fleet

Whether running locally or with a fleet of agents, the engine, DSL, and protocol stay the same.

- ✓ **Core engine** — Deterministic execution, one step at a time. Resumable and replayable.
- ✓ **DSL** — Author workflows in YAML, JSON, or TypeScript that compile to one tree shape.
- ✓ **STDIO MCP server** — Native protocol for local agents. `npx @behaviors-sh/cli mcp` and you're done.
- → **HTTP MCP server** — Host central workflows any fleet of agents can reach.

> MCP is the [Model Context Protocol](https://modelcontextprotocol.io/) — the wire format agents already speak.

## Dive in

[Open the builder](https://app.behaviors.sh) · [Get started](/getting-started) · [Drive over MCP](/guide/mcp) · [View on GitHub](https://github.com/flying-dice/behaviors-sh)
