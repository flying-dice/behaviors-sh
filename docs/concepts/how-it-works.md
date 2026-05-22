---
title: How it works
description: A walkthrough of a behaviors-sh execution — the YAML tree on one side, the MCP tool exchange on the other, and the cursor moving between them one step at a time.
---

# How it works

You define a tree. The agent drives execution.

Two halves run side by side: the YAML tree on one side, the MCP tool exchange on the other, and the cursor moving between them. A single node enters the active state, the agent answers the request, the runtime advances, and the next node lights up.

## The exchange

On one side, a small `deploy` tree — a `sequence` with three `action` children: `Run_Tests`, `Build_Image`, and `Push_Image`. Each action carries one or more `evaluate` or `instruct` steps.

On the other side, the loop the agent walks once you hand it the trace URI:

- **`next_step(trace_output)`** asks the runtime what to do. The response is one of four shapes: `evaluate` (a precondition to check), `instruct` (work to perform), `done`, or `failure`.
- **`eval(trace_output, true|false)`** answers an `evaluate` step. The runtime advances if the precondition holds; the action fails immediately if it does not.
- **`submit(trace_output, "success"|"failure"|"running")`** reports the outcome of an `instruct` step. `success` advances the cursor; `failure` aborts the action by the parent's branch rules; `running` ack-and-pauses without advancing.

As each node finishes, it settles into `success` (green) or `failure` (red). The cursor — the pink ring — is always sitting on the node the agent is currently working on. The agent never sees anything else.

## The contract, in three lines

1. **You write the tree.** Composite nodes (`sequence`, `selector`, `parallel`) coordinate; `action` nodes do the work.
2. **The runtime walks it.** It hands the agent the next step, gates each one on declared state, and persists the cursor between calls.
3. **The agent answers.** It evaluates preconditions and performs instructions. It does not decide which step comes next.

That separation — control flow on the runtime side, work on the agent side — is what makes the same workflow deterministic, resumable, and replayable.

## Next

- [State](/concepts/state) — the `$VAR` blackboard and `$CONST` world model the agent reads and writes between steps.
- [Branches and actions](/concepts/branches-and-actions) — the four primitives in detail, with the rules each one enforces.
- [Drive over MCP](/guide/mcp) — every tool the loop above uses, with response shapes and the phase machine behind them.
