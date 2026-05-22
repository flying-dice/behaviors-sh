---
description: Five-minute walkthrough — clone behaviors-sh, hand the hello-world tree to your agent, watch it drive a workflow end-to-end, then open the trace in the canvas viewer.
---

# Get started

A five-minute walkthrough: clone the repo, plug it into Claude Code as an MCP server, hand the hello-world tree to your agent, then open the trace it produced in the browser viewer.

::: tip Terms used below
`$VAR` is the per-execution read-write scope, `$CONST` is the read-only seed, `instruct` is an action step that asks the agent to do work, and `evaluate` is an action step that asks the agent to judge a precondition.
:::

## 1. Clone and install

behaviors-sh isn't on a registry yet. Clone the repo and let bun resolve the workspace:

```sh
git clone https://gitlab.beluga-sirius.ts.net/flying-dice/behaviors-sh.git
cd behaviors-sh
bun install
```

Verify the CLI:

```sh
bun run cli mcp --help
```

You see the `mcp` subcommand help. If you do not, double-check that bun resolved the workspace packages.

## 2. Wire it into Claude Code

The repo ships a project-scoped `.mcp.json`:

```json
{
  "mcpServers": {
    "behaviors-sh": {
      "command": "bun",
      "args": ["packages/cli/src/index.ts", "mcp"]
    }
  }
}
```

Open the cloned repo in Claude Code. On launch it asks to approve the project-scoped server; accept, and twelve tools become available as `mcp__behaviors-sh__*`.

> Prefer a different MCP client? Run `bun run cli mcp` directly for STDIO, or `bun run cli mcp --http --port 3001` for Streamable HTTP at `POST http://127.0.0.1:3001/mcp`.

## 3. Materialise the hello-world tree

`trees/hello-world` is a small tree: classify the time of day, then pick the matching greeting from a three-way selector. It exercises three primitives — `sequence`, `selector`, `action` — in a few dozen lines. Materialise it from the TypeScript DSL to a JSON file the runtime can read:

```sh
bun -e 'import { helloWorld } from "./trees/hello-world/src"; \
import { writeFileSync, mkdirSync } from "node:fs"; \
mkdirSync(".behaviors-sh/trees", { recursive: true }); \
writeFileSync(".behaviors-sh/trees/hello-world.json", helloWorld.toJson());'
```

`tree.json` now sits at `.behaviors-sh/trees/hello-world.json`.

## 4. Hand it off to your agent

In Claude Code, send:

```text
Drive the behaviour tree at
file:///<absolute>/.behaviors-sh/trees/hello-world.json
and write the trace to
file:///<absolute>/.behaviors-sh/executions/first-run.json

Use the mcp__behaviors-sh tools: start_execution, then loop
next_step → eval/submit until you see { status: "done" }.
Acknowledge the protocol gate first. Write any $VAR values
the instructs ask for via var_write before submitting.
```

That is the entire human-side interaction. The agent reads the protocol from the gate instruct, creates the execution, and drives the loop autonomously.

## 5. Watch the agent drive the loop

Each turn, the agent calls one tool and reads the JSON response.

The first `next_step` on any execution is a runtime-level gate — every execution starts here regardless of which tree it runs:

```json
{
  "type": "instruct",
  "name": "Acknowledge_Protocol",
  "instruction": "Read the runtime protocol below in full..."
}
```

The agent reads the protocol and acknowledges:

```text
submit(trace_output, "success")
```

After the gate, `next_step` returns the tree's first real step:

```json
{
  "type": "instruct",
  "name": "Determine_Time",
  "instruction": "Check the system clock to get the current hour. Classify as: before 12:00 = \"morning\", 12:00-17:00 = \"afternoon\", after 17:00 = \"evening\". Store the classification string at $VAR.Hello_World__time_of_day."
}
```

The agent does the work — checks the clock, classifies the hour as `morning` — then writes the result and submits:

```text
var_write(trace_output, "Hello_World__time_of_day", "\"morning\"")
submit(trace_output, "success")
```

The next call returns an `evaluate`:

```json
{
  "type": "evaluate",
  "name": "Morning_Greeting",
  "expression": "$VAR.Hello_World__time_of_day is \"morning\""
}
```

The agent reads `$VAR` via `var_read`, decides the precondition holds, and answers:

```text
eval(trace_output, true)
```

The loop repeats — `next_step` → do the work or judge the precondition → `submit` or `eval` — until:

```json
{ "status": "done" }
```

The agent only ever sees the next request.

## 6. Open the trace in the canvas

Start the desktop UI:

```sh
bun run cli
```

Click **Executions** in the left rail, then **Open trace file**, then pick `.behaviors-sh/executions/first-run.json`. The tree renders as a canvas with status-coloured node borders — emerald for success, red for failure, amber-pulsing for the in-flight cursor. Click any node to see, on the right:

- the original `instruct` / `evaluate` text the tree asked,
- the agent's narration of what it did,
- its reasoning (the `note` field),
- inline `$VAR.x` / `$CONST.y` references as hoverable badges showing the live value.

For the hello-world run above, the cursor advanced through the root sequence (`Hello_World` → `Determine_Time` → `Choose_Greeting`) and the selector chose `Morning_Greeting` after its `evaluate` precondition held — the afternoon and evening branches were never entered.

## What that gives you

Your agent drove a structured workflow without a 2,000-line system prompt, without a JSON schema in its context, and without chain-of-thought reasoning. The tree handed it exactly one task at a time, and only let it advance when the task was complete.

That is the core idea: **deterministic structure for non-deterministic agents.**

## Next

- [Writing trees](/guide/writing-trees) — author your own tree with the TypeScript DSL.
- [Driving over MCP](/guide/mcp) — the full twelve-tool surface and the phase machine behind it.
- [Inspecting executions](/guide/inspecting-executions) — every panel in the canvas viewer and what it tells you.
