/**
 * Tiny jest-style DSL for authoring behaviors-sh behaviour trees in
 * TypeScript.
 *
 * A file's "output" is just a node (composite or action). Package metadata
 * (`name`, `version`) lives in `package.json`; the build pipeline pairs it
 * with the emitted node at write time.
 *
 * @remarks
 *
 * **State scopes.** Two flat, execution-wide scopes with different *roles*:
 *
 * - **variables** — read/write containers the tree fills in as it runs.
 *   Actions write values into `$VAR`; later steps read them out. Initial
 *   values declared here can be `null` (or anything else) — they are just
 *   the starting state of the container.
 * - **constants** — values substituted into instructions at runtime. Set
 *   in the DSL source by the tree author; nothing mutates them after
 *   execution-create. The agent reads `$CONST.<key>` while performing a
 *   step and interpolates whatever the author baked in.
 *
 * Each handle is its own variable. {@link variable} and {@link constant}
 * register the key + value and return a path **string** branded with type
 * information. Drop the string into a template literal anywhere:
 *
 * ```ts
 * sequence("Greet", (root) => {
 *   const greeting = variable("greeting", null);
 *   action("Write", () => {
 *     instruct(`write to ${greeting}`); // → "write to $VAR.Greet__greeting"
 *   });
 * });
 * ```
 *
 * **Where you call them.** {@link variable} and {@link constant} **must**
 * be called inside a composite or action body. Module-scope calls throw
 * — there is no fallback bucket. Every declared key is mangled with
 * `<EnclosingNodeName>__<key>` so two components declaring overlapping
 * key names can't collide when the runtime flattens.
 *
 * The runtime flattens state from every node into one `$VAR` and one
 * `$CONST` map at execution-create.
 *
 * @example
 * ```ts
 * import { action, constant, instruct, sequence, variable } from "@behaviors-sh/dsl";
 *
 * export const tree = sequence("Greet", (root) => {
 *   root.description = "Greet the current user.";
 *   const greeting    = variable("greeting", null);
 *   const currentUser = constant("current_user", "world");
 *
 *   action("Write_Greeting", () => {
 *     instruct(`Write "Hello, ${currentUser}" to ${greeting}.`);
 *   });
 * });
 * ```
 *
 * @packageDocumentation
 */

import type { ActionNode } from "./nodes/action-node.ts";
import type { CompositeNode } from "./nodes/composite-node.ts";

export { type DelegateOptions, delegate } from "./delegate.ts";
export { ActionNode, action } from "./nodes/action-node.ts";
export {
	type CompositeKind,
	CompositeNode,
	parallel,
	selector,
	sequence,
} from "./nodes/composite-node.ts";
export { Node } from "./nodes/node.ts";
export type { NodeState, StateScope } from "./nodes/state.ts";
export {
	constant,
	type ConstantRef,
	type Ref,
	variable,
	type VariableRef,
} from "./refs.ts";
export { evaluate, instruct, type Step } from "./steps.ts";

/** Discriminated union of every node kind the DSL factories produce. */
export type TreeNode = CompositeNode | ActionNode;
