// Shape of the optional `state` block on any tree node — initial values
// for the runtime's `$VAR` (read/write) and `$CONST` (set in source,
// immutable thereafter) scopes. Both halves are optional; emitting an
// empty block is meaningless so the DSL only attaches `state` when at
// least one half has content.

export type StateScope = "var" | "const";

export interface NodeState {
	var?: Record<string, unknown>;
	const?: Record<string, unknown>;
}
