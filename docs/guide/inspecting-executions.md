---
title: Inspecting executions
description: Open a trace file in the behaviors-sh browser canvas — status-coloured tree, per-node trace timeline, $VAR/$CONST inspector, engine debug pane. The same canvas your tree-builder uses, plus a node click that drops the agent's reasoning into the right panel.
---

# Inspecting executions

You drove an execution. The runtime wrote a self-contained JSON document to disk at `trace_output`. This page is about opening that file in the browser canvas viewer — the same shape the [tree builder](/guide/writing-trees) uses, with the execution overlaid.

## Open the viewer

```sh
bun run cli              # opens the desktop UI (webview)
bun run dev:client       # or dev-server the client at :5173
```

In the left rail, click **Executions**, then **Open trace file**. Pick any `*.json` written by the runtime. The file lives in your `trace_output` directory — usually under `.behaviors-sh/executions/`, but the runtime writes wherever you pointed it.

The execution stays in the "Opened traces" list for the rest of the tab session. Reload the tab and the list clears — re-pick the file to bring it back. Nothing is persisted in the browser.

## The canvas

The tree renders as a horizontal layout: composites (sequence / selector / parallel) as chamfered nodes, actions as rectangles. Status overrides the default border colour:

| Border | Meaning |
| --- | --- |
| **Emerald** | Node succeeded. |
| **Red** | Node failed. |
| **Amber (pulsing)** | The cursor is here — the agent is currently working on this node. |
| **Muted** (default) | The runtime never reached this node (a sibling branch already won, or a parent failed). |

A small status dot sits in the top-right corner of every visited node — same colour as the border, easier to scan at a glance.

A floating toolbar in the top-right of the canvas gives you `−` / zoom % / `+` / fit-to-view / inspector-toggle. Drag the canvas to pan; `⌘ + scroll` to zoom. The viewport auto-fits whenever you open a new trace.

## The inspector

The right panel has three tabs:

### Activity

Click a node on the canvas to see its trace entries. A composite shows everything that happened in its **subtree** — selecting the root surfaces the whole run, selecting `Choose_Greeting` surfaces only its winning branch.

Each entry is a card:

- A **status icon** (✓ / ✗ / ● live / 🛡 protocol / 🧠 thought) on the left edge. Hover it for the runtime's outcome label (`action_complete`, `evaluation_passed`, etc.).
- The **node name** and relative timestamp.
- The **prompt** — the original `instruct` / `evaluate` text the tree asked. Rendered as a quote (for instructs) or as monospace code (for evaluates).
- The **agent's narration** under an "Agent" label — what they said they did.
- The **reasoning** under a "Reasoning" label with a sparkle icon — the optional `note` the agent attached.

Inline `$VAR.x` / `$CONST.y` references in any of those blocks become hoverable badges. Hover one to see the current live value pulled from the doc — short string previews are shown inline, long values truncate to ~220 chars.

### State

The full `$VAR` / `$CONST` scope.

- **Variables** ($VAR) are mutable — actions write into them as the run progresses. Each slot is a row with a filled emerald dot (set) or a hollow outline (declared but null).
- **Constants** ($CONST) are immutable — baked in at execution-create from `tree.state.const`. Faintly tinted to read as "different".

Values are rendered with type-aware formatting: strings in curly quotes, booleans as TRUE/FALSE pills, numbers in tabular numerals, objects/arrays as inline JSON. Mangled keys (`Hello_World__time_of_day`) display as `time_of_day` with `in Hello_World` as subordinate context.

### Engine

The runtime's bookkeeping: `node_status`, `step_index`, `retry_count`. Keys are dot-joined paths (`1.1.0` is "second top-level child → second of its children → first of those"). Useful when you're chasing a stuck cursor or wondering why a retry didn't fire.

## The trace file itself

The JSON is the source of truth. Re-opening the file gives you the document as it stood when last written; the runtime regenerates it on every state change. Top-level shape:

```json
{
  "uri":         "file:///abs/path/to/run.json",
  "schema_version": 1,
  "created_at":  "2026-05-22T09:14:01.022Z",
  "updated_at":  "2026-05-22T09:14:09.541Z",

  "tree_uri":    "file:///abs/path/to/hello-world.json",
  "tree":        { /* normalised tree, frozen at create */ },

  "status":      "complete",
  "phase":       "idle",
  "cursor":      "null",
  "protocol_accepted": true,

  "var":         { "Hello_World__time_of_day": "morning", "Hello_World__greeting": "..." },
  "const":       { "Hello_World__user_name": "...", "Hello_World__tone": "friendly", "Hello_World__language": "english" },

  "runtime":     { "node_status": { ... }, "step_index": { ... }, "retry_count": { ... } },
  "trace":       [ /* append-only audit log */ ]
}
```

The document is self-contained — every reachable byte the runtime needs lives in this file. Delete the original tree source and you can still re-open the trace because the resolved tree is embedded under `tree`.

## Debugging a stuck execution

Three fields point at the cursor:

| Field | Meaning |
| --- | --- |
| `status` | `running` while in flight; `complete` or `failed` when it terminated. |
| `phase` | `idle` if `next_step` will tick the engine; `evaluating` / `performing` if a step is mid-flight; `protocol` if the agent hasn't acknowledged the gate yet. |
| `cursor` | JSON-encoded `{ path, step }` pointing at the open node and its current step. `"null"` means no step in flight. |

### Common situations

- **`status: running`, `phase: idle`, `cursor: "null"`.** Healthy mid-execution between requests. The agent should call `next_step` to advance.
- **`phase: performing` for hours.** The agent picked up an instruct and never reported back. Either submit on its behalf (`submit(uri, "success")` if it actually finished) or `reset_execution(uri)` to start over.
- **`status: failed`.** A selector exhausted all its children, or an action in a sequence failed. The canvas shows the red node; click it to see the agent's last `submitted` / `note` and figure out why.
- **The canvas has red nodes but `status: running`.** A failure was recorded inside a selector that still has remaining children. The execution is fine — the agent will move on at the next `next_step`.

## Sharing a run

The trace file is plain JSON. Commit it, ship it as an artefact, paste it into a code review — it's portable. Anyone with the file and the viewer running locally can re-open it.

Since the tree is embedded inside the document, the recipient doesn't need access to your `tree_uri` to view the run.

## Next

- [Writing trees](/guide/writing-trees) — author the trees you'll be inspecting.
- [Driving over MCP](/guide/mcp) — the tool surface that produces these trace files.
