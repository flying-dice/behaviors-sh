---
title: Writing trees
description: Build the bundled hello-world tree from scratch with the TypeScript DSL — file layout, primitives, state, retries. End-to-end tutorial.
---

# Writing trees

Re-create the bundled `hello-world` tree from scratch with the TypeScript DSL. At the end you have a working tree you can drive over MCP.

behaviors-sh accepts trees as TypeScript, YAML, or JSON; this guide uses TypeScript because the DSL gives the strongest IDE support and matches the bundled examples.

## What you build

A `hello-world.ts` that exports a sequence with three children: a time-of-day classifier, a three-way selector (morning / afternoon / evening), and a final announce step. The DSL compiles to JSON via `.toJson()`; that JSON is what the runtime reads.

## 1. Create the package

Trees in this repo live in `trees/<slug>/` as workspace packages. Each one is a tiny package that exports the tree node from `src/index.ts`:

```sh
mkdir -p trees/hello-world/src
touch trees/hello-world/package.json
touch trees/hello-world/src/index.ts
touch trees/hello-world/src/hello-world.ts
```

`trees/hello-world/package.json`:

```json
{
  "name": "@behaviors-sh/tree-hello-world",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@behaviors-sh/dsl": "workspace:*",
    "@behaviors-sh/spec": "workspace:*"
  }
}
```

`src/index.ts`:

```ts
export * from "./hello-world";
```

## 2. Author the root sequence

```ts
// trees/hello-world/src/hello-world.ts
import {
  action,
  constant,
  evaluate,
  instruct,
  selector,
  sequence,
  variable,
} from "@behaviors-sh/dsl";

export const helloWorld = sequence("Hello_World", (node) => {
  node.version = "0.1.0";
  node.description =
    "Greet a user based on time of day. Demonstrates sequence, selector, and action primitives.";

  // …state declarations + child nodes go here
});
```

`sequence(name, builder)` opens a root composite. Inside the builder, every nested call adds a child to the current scope. The runtime knows nothing about your TypeScript — it only sees the JSON produced by `helloWorld.toJson()`.

::: tip Node naming
Use **PascalCase with underscores** (`Determine_Time`, `Morning_Greeting`). The canvas viewer renders `_` as a space, so `Choose_Greeting` becomes "Choose Greeting" on screen.
:::

## 3. Declare state

`$VAR` slots are mutable — actions write into them as the run progresses. `$CONST` slots are immutable — set in the DSL source, never written after execution-create.

```ts
const timeOfDay = variable("time_of_day", null);
const greeting  = variable("greeting", null);
const userName  = constant(
  "user_name",
  'retrieve by running the shell command "whoami"',
);
const tone      = constant("tone", "friendly");
const language  = constant("language", "english");
```

Each handle is a path string (e.g. `$VAR.Hello_World__time_of_day`) you can drop into a template literal. The DSL mangles the key with the declaring node's name so two independent trees sharing a slot name don't collide.

::: tip Sentence-shaped constants
`user_name` above is a **directive**: when an action reads `$CONST.Hello_World__user_name`, the agent runs `whoami` and uses the result. Constants don't have to be literal values — they can describe how to get the value.
:::

## 4. The classifier action

```ts
action("Determine_Time", () => {
  instruct(`
    Check the system clock to get the current hour. Classify as:
    before 12:00 = "morning", 12:00-17:00 = "afternoon",
    after 17:00 = "evening".
    Store the classification string at ${timeOfDay}.
  `);
});
```

An `action` is a leaf — it asks the agent to do work. The body adds one or more steps:

- **`instruct(...)`** — work the agent performs. When fired, the runtime returns `{ type: "instruct", ... }` from `next_step`. The agent answers with `submit(success | failure | running)`.
- **`evaluate(...)`** — a precondition the agent judges. Returns `{ type: "evaluate", ... }`. The agent answers with `eval(true | false)`.

Actions can have any number of steps; the runtime walks them in order, advancing on each `success` submission and closing the action on the last step.

## 5. The selector

```ts
selector("Choose_Greeting", () => {
  action("Morning_Greeting", () => {
    evaluate(`${timeOfDay} is "morning"`);
    instruct(
      `Compose a cheerful morning greeting addressing ${userName} in ${language} with a ${tone} tone. Store at ${greeting}.`,
    );
  });
  action("Afternoon_Greeting", () => {
    evaluate(`${timeOfDay} is "afternoon"`);
    instruct(
      `Compose a warm afternoon greeting addressing ${userName} in ${language} with a ${tone} tone. Store at ${greeting}.`,
    );
  });
  action("Evening_Greeting", () => {
    evaluate(`${timeOfDay} is "evening"`);
    instruct(
      `Compose a relaxed evening greeting addressing ${userName} in ${language} with a ${tone} tone. Store at ${greeting}.`,
    );
  });
});
```

A `selector` runs children in order until one **succeeds**. Each branch is gated by an `evaluate` precondition; the runtime asks the agent to judge the expression and only fires the inner `instruct` if it holds.

If no child succeeds, the whole selector fails — its parent sees the failure and reacts.

## 6. The announce step

```ts
action("Announce_Greeting", () => {
  instruct(`
    Read ${greeting} from the execution state and print it verbatim
    to the human.
  `);
});
```

That's the whole tree — `Hello_World` is a `sequence` with three children: `Determine_Time`, `Choose_Greeting`, `Announce_Greeting`. The runtime walks them in order; if `Choose_Greeting` fails (no time-of-day branch matched), the sequence fails and `Announce_Greeting` is skipped.

## 7. Materialise and run

The runtime reads JSON, not TypeScript. Emit it once:

```sh
bun -e 'import { helloWorld } from "./trees/hello-world/src"; \
import { writeFileSync, mkdirSync } from "node:fs"; \
mkdirSync(".behaviors-sh/trees", { recursive: true }); \
writeFileSync(".behaviors-sh/trees/hello-world.json", helloWorld.toJson());'
```

`.behaviors-sh/trees/hello-world.json` now exists. Hand it to an agent via Claude Code:

```text
Drive the tree at file:///<abs>/.behaviors-sh/trees/hello-world.json,
trace_output file:///<abs>/.behaviors-sh/executions/run.json
```

The agent walks the tree end-to-end using the [MCP loop](/guide/mcp). When it's done, open the trace in the [canvas viewer](/guide/inspecting-executions).

## The fourth primitive

`hello-world` uses three of the four primitives. The fourth — `parallel` — runs all children concurrently and succeeds only if every child succeeds:

```ts
parallel("Gather_Context", () => {
  action("Read_Schema", () => { instruct(`...`); });
  action("Read_Conventions", () => { instruct(`...`); });
});
```

Drop one in when you have two reads that don't depend on each other.

## Retries

Any node can carry a `retries` count. On failure, the runtime resets its subtree (clearing the inner `node_status` / `step_index` so a fresh attempt starts from the top of that node) and re-fires until the budget is exhausted:

```ts
action("Validate_Response", () => {
  // …
}).retries = 3;
```

`$VAR` writes from the previous attempt persist across retries — the whole point of a retry is that the next attempt sees what the previous one produced.

## Next

- [Driving over MCP](/guide/mcp) — the twelve-tool surface the agent uses to walk a tree.
- [Inspecting executions](/guide/inspecting-executions) — open the trace file in the canvas viewer.
