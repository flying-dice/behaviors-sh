// Delegated-subagent sugar. Desugars into a fresh sequence whose
// children are `[Spawn_<name>, ...body-children, Return_To_Parent_<name>]`.
// The runtime doesn't know about delegation — it just sees the three
// instructs and walks them like any other.

import objectHash from "object-hash";
import pkg from "../package.json" with { type: "json" };
import { returnInstruct, spawnInstruct } from "./delegate-templates.ts";
import { action } from "./nodes/action-node.ts";
import { type CompositeNode, sequence } from "./nodes/composite-node.ts";
import type { VariableRef } from "./refs.ts";
import { evaluate, instruct } from "./steps.ts";

/**
 * Author-supplied options for a {@link delegate} scope. All optional —
 * they tune the boilerplate baked into the `Spawn_<name>` and
 * `Return_To_Parent_<name>` marker actions and whether the Return action
 * gates on a `$VAR` write.
 */
export interface DelegateOptions {
	/**
	 * Free-form text describing what the subagent should do. Interpolated
	 * verbatim into the Spawn instruct under a `BRIEF:` label.
	 */
	brief?: string;

	/**
	 * Model hint for the spawned subagent (e.g. `"haiku"`, `"sonnet"`,
	 * `"opus"`). Advisory only — behaviors-ui does not enforce it; whether
	 * the parent agent's harness honours the hint is up to the harness.
	 */
	model?: string;

	/**
	 * Optional `$VAR` reference the inner work is expected to populate.
	 * When set, the `Return_To_Parent_<name>` action gets a leading
	 * `evaluate("${output} is set")` step so the scope fails if the
	 * subagent submitted success for every inner action without actually
	 * writing the declared slot.
	 */
	output?: VariableRef<unknown>;
}

// Build-time-deterministic exit token. Same scope name + same DSL
// version → same token, so a regenerated tree file is reproducible
// across builds. The token is a clean-exit signal, not a security
// boundary; baking it into the tree file in plaintext is intentional.
function deriveExitToken(scopeName: string): string {
	const hash = objectHash(`${scopeName}:${pkg.version}`, {
		algorithm: "sha1",
		encoding: "hex",
	}).slice(0, 8);
	return `DLG__${scopeName}__${hash}`;
}

/**
 * Declare a delegated subagent scope.
 *
 * Pure DSL sugar — the runtime doesn't know about it. Desugars into a
 * fresh `sequence` named exactly `name` whose children are
 * `[Spawn_<name>, ...body-children, Return_To_Parent_<name>]`.
 *
 * @example
 * ```ts
 * const greeting = variable("greeting", null);
 * delegate("Compose_Greeting", {
 *   brief: "Pick the time-of-day branch and compose one short sentence.",
 *   model: "haiku",
 *   output: greeting,
 * }, () => {
 *   selector("Choose_Greeting", () => {
 *     action("Morning_Greeting", () => { ... });
 *     action("Afternoon_Greeting", () => { ... });
 *     action("Evening_Greeting", () => { ... });
 *   });
 * });
 * ```
 */
export function delegate(
	name: string,
	options: DelegateOptions,
	body: () => void,
): CompositeNode {
	const token = deriveExitToken(name);
	return sequence(name, () => {
		action(`Spawn_${name}`, () => {
			instruct(spawnInstruct(name, token, options));
		});
		body();
		action(`Return_To_Parent_${name}`, () => {
			if (options.output) evaluate(`${options.output} is set`);
			instruct(returnInstruct(name, token));
		});
	});
}
