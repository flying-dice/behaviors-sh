---
description: Two state scopes in behaviors-sh — $VAR is a per-execution blackboard agents read and write; $CONST is a read-only world model the tree observes.
---

# State

behaviors-sh separates state into **two scopes**, written explicitly, never implicit. `$VAR` is the per-execution blackboard the agent writes into; `$CONST` is the read-only environment the tree observes.

A **blackboard** is the term used in the behaviour-tree and game-AI literature for a key-value store scoped to one execution and used to pass data between steps.

## `$VAR`

A key-value store private to one execution. Actions read from it, write to it, and use it to thread data between steps.

```text
$VAR.greeting          = "Good morning, Alice!"   # output of one step, input to the next
$VAR.confidence_score  = 0.92                     # number computed during the run
$VAR.error_log         = [ ... ]                  # accumulating list
```

`$VAR` is initialised when the execution is created. Every state change persists immediately to the trace document — kill the process and resume tomorrow.

## `$CONST`

The **environment** the agent operates in. You do not write `$CONST` from inside the execution — you observe it. Seeded once at execution-create from the tree's `state.const` block:

```yaml
state:
  const:
    user_name: retrieve by running the shell command "whoami"
    current_branch: the output of git rev-parse --abbrev-ref HEAD
    api_endpoint: https://api.example.com
    tone: friendly
```

The first two values are not literals — they are **directives** that tell the agent how to fetch the value. When an action reads `$CONST.user_name`, the agent runs `whoami` and uses the result. The third is a literal that never changes during the execution. The fourth is a configuration knob.

## Why two scopes

`$VAR` is something **your tree creates**. `$CONST` is something **the world tells you**. Putting them in different scopes makes the source of every value explicit:

- A reader of `$CONST.user_name` knows the value came from the environment.
- A reader of `$VAR.greeting` knows the value was computed earlier in the execution.

A single "context" object hides where data came from. That is the bug surface that hurts agentic systems hardest: was this value something I produced, or something I read? behaviors-sh makes you answer up front.

## Next

- [Branches and actions](/concepts/branches-and-actions) — the four primitives that read and write these scopes.
- [Drive over MCP](/guide/mcp) — the tools that reach state: `var_read`, `var_write`, `const_read`.
