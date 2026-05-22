// Branded path strings for $VAR / $CONST references. Returned by
// `variable()` / `constant()` and interpolated into evaluate/instruct
// expressions via template literals.

import { currentFrame } from "./builder.ts";
import type { StateScope } from "./nodes/state.ts";

// Brand tags — declared but never assigned at runtime; purely type-level.
declare const variableRefBrand: unique symbol;
declare const constantRefBrand: unique symbol;

/**
 * A reference to a `$VAR.<key>` path, returned by {@link variable}.
 *
 * At runtime this is a plain string (so template-literal interpolation
 * just works). At the type level it carries:
 *
 * - the **scope brand** (so a `VariableRef` cannot be assigned to a
 *   {@link ConstantRef} and vice-versa), and
 * - **`T`** — the value type stored at the reference.
 *
 * @typeParam T - The value type stored at the reference.
 */
export type VariableRef<T = unknown> = string & {
	readonly [variableRefBrand]: T;
};

/**
 * A reference to a `$CONST.<key>` path, returned by {@link constant}.
 *
 * @typeParam T - The value type substituted into instructions at runtime.
 */
export type ConstantRef<T = unknown> = string & {
	readonly [constantRefBrand]: T;
};

/**
 * Either a {@link VariableRef} or {@link ConstantRef}. Useful for APIs
 * that accept a reference from either scope.
 *
 * @typeParam T - The value type stored at the reference.
 */
export type Ref<T = unknown> = VariableRef<T> | ConstantRef<T>;

// All declarations attach to the node on top of the builder stack and
// mangle the key with `<EnclosingNodeName>__<key>`. Module-scope calls
// (no body in flight) throw — there's no fallback bucket.
function attach(scope: StateScope, key: string, value: unknown): string {
	const top = currentFrame();
	if (!top) {
		const name = scope === "var" ? "variable" : "constant";
		throw new Error(
			`${name}() must be called inside a composite or action body — ` +
				`declare state at the root level via the body callback, e.g. ` +
				`sequence("Tree", (root) => { const k = ${name}("...", ...); ... })`,
		);
	}
	return top.node.declareState(scope, key, value);
}

/**
 * Declare a `$VAR` read/write container and return a path reference
 * pointing at it.
 *
 * Must be called inside a composite or action body — the key mangles
 * with the enclosing node's name (`<NodeName>__<key>`) so independent
 * components can reuse key names without colliding when the runtime
 * flattens.
 *
 * The returned {@link VariableRef} is a branded string. Interpolate it
 * inline in {@link evaluate} / {@link instruct} expressions:
 *
 * @example
 * ```ts
 * sequence("Hello_World", (root) => {
 *   const greeting = variable("greeting", null);
 *   action("Write_Greeting", () => {
 *     instruct(`write the result to ${greeting}`);
 *     // → "write the result to $VAR.Hello_World__greeting"
 *   });
 * });
 * ```
 */
export function variable<T>(key: string, defaultValue: T): VariableRef<T> {
	const mangled = attach("var", key, defaultValue);
	return `$VAR.${mangled}` as VariableRef<T>;
}

/**
 * Declare a `$CONST` value and return a path reference pointing at it.
 *
 * Constants are baked in at DSL-author time. Nothing mutates them after:
 * no CLI write verb, no runtime hook, no per-execution override. The
 * value declared here is the value the agent sees for the entire
 * execution.
 *
 * Must be called inside a composite or action body — the key mangles
 * with the enclosing node's name (`<NodeName>__<key>`).
 */
export function constant<T>(key: string, value: T): ConstantRef<T> {
	const mangled = attach("const", key, value);
	return `$CONST.${mangled}` as ConstantRef<T>;
}
