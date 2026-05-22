---
title: URI schemes
description: behaviors-sh is URI-addressed end-to-end — the caller picks where a tree is read from and where the trace is written. file:// is the default; memory:// is ephemeral; the routing layer makes each scheme a single registration.
---

# URI schemes

Every tool that touches storage takes a URI, never a bare path. The caller decides where a tree lives and where its trace lands — the runtime reads and writes there.

Two schemes ship in the box:

| Scheme | Reader / writer | Use it for |
| --- | --- | --- |
| `file://` | File on disk | Local development; checked-in trees; persistent traces. |
| `memory://<id>` | In-process map | Tests, ephemeral runs, scratch executions that should vanish on restart. |

## file://

The everyday case. The path after `file://` is absolute — relative paths are rejected, on purpose; an execution that resumes from a different working directory should still find its tree.

```text
tree_uri:     file:///abs/path/to/hello-world.json
trace_output: file:///abs/path/to/.behaviors-sh/executions/run.json
```

The reader walks the JSON / YAML and validates it against the **tree schema** (`@behaviors-sh/spec`). The writer creates the directory tree if missing and writes atomically — `fs.write(tmp); fs.rename(tmp, target)` — so a half-written trace never appears on disk.

## memory://

Same shape, no disk. The `<id>` after the scheme is the in-process key.

```text
tree_uri:     memory://hello-world-test
trace_output: memory://run-1
```

Two ids are isolated; two executions with the same id share state. The map lives in the runtime, so it dies when the process dies. Under the HTTP transport the runtime is shared across requests, so `memory://` runs survive between requests on the same server — that's the only persistence they get.

## Why URIs

A URI tells the runtime three things in one string: **where** the data lives, **how** to reach it, and **which** address space it belongs to. A bare path answers only the first and assumes the other two.

The moment a second backend appears — S3, HTTP, a database — the bare-path model breaks: you thread an out-of-band scheme through every call site. URIs put the scheme inline, so each new backend is a single registration.

## Adding a scheme

Schemes are registered against the routing tree-reader, execution-reader, and execution-writer in `packages/cli/src/mcp/io/`. Each entry maps a scheme prefix (`https://`, `s3://`) to a concrete adapter that implements the three interface methods.

```ts
io.tree.register("https", new HttpTreeReader());
```

The adapter handles its own caching, auth, and error mapping. Everything else — the MCP tool surface, the verbs, the runtime — is unchanged.

## Next

- [Drive over MCP](/guide/mcp) — the twelve-tool surface that consumes these URIs.
- [Inspecting executions](/guide/inspecting-executions) — the trace file the writer produces.
