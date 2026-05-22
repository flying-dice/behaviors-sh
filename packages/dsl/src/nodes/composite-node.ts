// Composite (children-bearing) tree node. Construct via the three
// branching factories — `sequence`, `selector`, `parallel` — which all
// share the same body-callback shape; only the runtime semantics on the
// resulting `type` differ.

import { compositeParent, popFrame, pushComposite } from "../builder.ts";
import { Node } from "./node.ts";

/**
 * The composite (children-bearing) node kinds. Maps directly onto the
 * behaviors-sh runtime's three branching primitives.
 *
 * - `sequence` — run children left-to-right; fail on first child failure.
 * - `selector` — run children left-to-right; succeed on first child success.
 * - `parallel` — run all children together; succeed when all succeed.
 */
export type CompositeKind = "sequence" | "selector" | "parallel";

export interface CompositePayload {
	children: Node[];
}

export class CompositeNode extends Node<CompositeKind, CompositePayload> {
	readonly children: Node[] = [];

	protected payload(): CompositePayload {
		return { children: this.children };
	}
}

// Shared implementation under all three composite factories.
function composite(
	kind: CompositeKind,
	name: string,
	body: (node: CompositeNode) => void,
): CompositeNode {
	const node = new CompositeNode(kind, name);
	compositeParent()?.children.push(node);
	pushComposite(node);
	try {
		body(node);
	} finally {
		popFrame();
	}
	return node;
}

/**
 * Declare a `sequence` composite. Children run left-to-right; the
 * sequence fails on the first child failure and succeeds when every
 * child succeeds.
 */
export function sequence(
	name: string,
	body: (node: CompositeNode) => void,
): CompositeNode {
	return composite("sequence", name, body);
}

/**
 * Declare a `selector` composite. Children run left-to-right; the
 * selector succeeds on the first child success and fails when every
 * child fails.
 */
export function selector(
	name: string,
	body: (node: CompositeNode) => void,
): CompositeNode {
	return composite("selector", name, body);
}

/**
 * Declare a `parallel` composite. All children run together; the
 * parallel succeeds when every child has succeeded and fails as soon as
 * any child fails.
 */
export function parallel(
	name: string,
	body: (node: CompositeNode) => void,
): CompositeNode {
	return composite("parallel", name, body);
}
