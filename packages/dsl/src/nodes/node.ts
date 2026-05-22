// Abstract root of every DSL-produced tree node. Holds shared metadata
// (description, version, retries, state), the `toJson()` serialiser, and
// the `declareState()` method that ref helpers call to attach mangled
// state keys onto the current node.
//
// `TType` narrows the literal `type` discriminator (e.g. "action",
// "sequence") so unions of `Node<TType, _>` discriminate on it without
// `declare` workarounds.
//
// `Payload` is the type-specific portion subclasses inject via
// `payload()` (`{ steps }` for actions, `{ children }` for composites).
// The base orchestrates serialisation; subclasses never override
// `toJson()`.
//
// `toJson` is a regular prototype method, so `JSON.stringify(node)`
// ignores it and emits the plain node shape. Callers wanting the
// canonical file-format string call `.toJson()` explicitly.

import { BehaviourNodeSchema } from "@behaviors-sh/spec";
import type { NodeState, StateScope } from "./state.ts";

const TREE_FILE_SCHEMA = "https://behaviors-sh.dev/schemas/tree.schema.json";

/**
 * Canonical tree-file shape emitted by `Node.toJson()`. The shared
 * header is fixed; `Payload` injects the type-specific portion
 * (`{ steps }` or `{ children }`).
 */
export type TreeFile<TType extends string, Payload extends object> = {
	$schema: string;
	type: TType;
	name: string;
	description?: string;
	version?: string;
	retries?: number;
	state?: NodeState;
} & Payload;

export abstract class Node<
	TType extends string = string,
	Payload extends object = object,
> {
	readonly type: TType;
	readonly name: string;

	description?: string;
	version?: string;
	retries?: number;
	state?: NodeState;

	protected constructor(type: TType, name: string) {
		this.type = type;
		this.name = name;
	}

	/**
	 * Type-specific payload — `{ steps }` on actions, `{ children }` on
	 * composites. Each subclass overrides with its narrowed return type;
	 * the base never inspects `this` for arbitrary fields.
	 */
	protected abstract payload(): Payload;

	/**
	 * Declare a state slot scoped to this node. The key is mangled with
	 * `<NodeName>__` so two independent components declaring overlapping
	 * key names don't collide when the runtime flattens.
	 *
	 * Used by the `variable()` / `constant()` ref helpers.
	 *
	 * @returns The mangled key, ready to be wrapped as a `$VAR.<...>` or
	 *   `$CONST.<...>` path string.
	 */
	declareState(scope: StateScope, key: string, value: unknown): string {
		const mangled = `${this.name}__${key}`;
		this.state ??= {};
		this.state[scope] ??= {};
		(this.state[scope] as Record<string, unknown>)[mangled] = value;
		return mangled;
	}

	toJson(): string {
		const file: TreeFile<TType, Payload> = {
			$schema: TREE_FILE_SCHEMA,
			type: this.type,
			name: this.name,
			...this.payload(),
		};
		if (this.description !== undefined) file.description = this.description;
		if (this.version !== undefined) file.version = this.version;
		if (this.retries !== undefined) file.retries = this.retries;
		if (this.state !== undefined) file.state = this.state;
		BehaviourNodeSchema.parse(file);
		return `${JSON.stringify(file, null, "\t")}\n`;
	}
}
