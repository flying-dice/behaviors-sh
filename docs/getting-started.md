---
description: Five-minute walkthrough to register the behaviors-sh MCP server, hand a behaviour tree to your agent, and watch it drive a workflow end-to-end.
---

# Get started

A five-minute walkthrough: register behaviors-sh, hand a tree to your agent, and watch it drive. For the vocabulary behind the moving parts, see [Why behaviour trees?](/concepts/).

::: tip Terms used below
`$VAR` is the per-execution blackboard, `instruct` is an action step that asks the agent to do work, and `evaluate` is an action step that asks the agent to judge a precondition. All three are defined in the [Concepts](/concepts/) tier.
:::

## 1. Register behaviors-sh as an MCP server

In any agent that speaks MCP — Claude Code, Claude Desktop, your own client — register `@behaviors-sh/cli` as a server. For Claude Code, add a project-scoped `.mcp.json`:

```json
{
  "mcpServers": {
    "behaviors-sh": {
      "command": "npx",
      "args": ["-y", "@behaviors-sh/cli", "mcp"]
    }
  }
}
```

Restart the client. The twelve runtime tools appear as `mcp__behaviors-sh__*`.

Verify by listing tools in your client; you should see `next_step`, `eval`, `submit`, `var_read`, `var_write`, and the rest.

## 2. Get a tree

Materialise the bundled `hello-world` tree to disk:

```sh
git clone https://github.com/flying-dice/behaviors-sh.git
cd behaviors-sh && bun install
bun -e 'import {helloWorld} from "./trees/hello-world/src"; \
  import {mkdirSync, writeFileSync} from "node:fs"; \
  mkdirSync(".behaviors-sh/trees", {recursive: true}); \
  writeFileSync(".behaviors-sh/trees/hello-world.json", helloWorld.toJson());'
```

`hello-world` is a small tree: classify the time of day, then pick the matching greeting from a three-way selector. It exercises three of the four behaviour-tree primitives — `sequence`, `selector`, and `action` — in a few dozen lines. The JSON lands at `.behaviors-sh/trees/hello-world.json`.

## 3. Hand it off to your agent

In Claude Code, ChatGPT, or any agent that speaks MCP, send:

```text
Drive the behaviors-sh hello-world tree end-to-end.

  tree_uri:     file:///<abs>/.behaviors-sh/trees/hello-world.json
  trace_output: file:///<abs>/.behaviors-sh/executions/first-run.json

Call start_execution, acknowledge the protocol gate, then loop
next_step → eval / submit until you see status: done.
```

That is the entire human-side interaction. The agent reads the protocol from the gate instruct, creates the execution, and drives the loop autonomously.

## 4. Watch the agent drive the loop

Each turn, the agent calls one tool and reads its JSON response.

The first `next_step` on any execution is a runtime-level gate that hands the agent the execution protocol — every execution starts here, regardless of which tree it runs:

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
  "instruction": "Check the system clock to get the current hour..."
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

The agent reads the expression, decides it holds, and answers:

```text
eval(trace_output, true)
```

The loop repeats — `next_step` → do the work or judge the precondition → `submit` or `eval` — until:

```json
{ "status": "done" }
```

The agent only ever sees the next request.

## 5. Open the trace in the viewer

Every state change is written to the trace file at `trace_output`. Open it in the browser canvas to see the tree light up: green nodes succeeded, red nodes failed, uncoloured nodes were never ticked.

For the `hello-world` run above, the cursor advanced through the root sequence (`Hello_World` → `Determine_Time` → `Choose_Greeting`) and the selector chose `Morning_Greeting` after its `evaluate` precondition held — the afternoon and evening branches were never entered.

## What that gives you

Your agent drove a structured workflow without a 2,000-line system prompt, without a JSON schema in its context, and without chain-of-thought. The tree handed it exactly one task at a time, and only let it advance when the task was complete.

That is the core idea: **deterministic structure for non-deterministic agents.**

## Next

- [Why behaviour trees?](/concepts/) — the problem they solve.
- [State](/concepts/state) — `$VAR` and `$CONST`, the two scopes the runtime exposes.
- [How it works](/concepts/how-it-works) — the runtime loop end-to-end.
- [Branches and actions](/concepts/branches-and-actions) — the four primitives.
