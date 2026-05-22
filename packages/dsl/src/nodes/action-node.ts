// Leaf action node — carries an ordered list of evaluate/instruct steps.
// Construct via the `action(name, body)` factory; the body callback
// registers steps via `evaluate(...)` / `instruct(...)`.

import type { Step } from "@behaviors-ui/spec";
import { compositeParent, popFrame, pushAction } from "../builder.ts";
import { Node } from "./node.ts";

export interface ActionPayload {
	steps: Step[];
}

export class ActionNode extends Node<"action", ActionPayload> {
	readonly steps: Step[] = [];

	constructor(name: string) {
		super("action", name);
	}

	protected payload(): ActionPayload {
		return { steps: this.steps };
	}
}

/**
 * Declare a leaf `action` node.
 *
 * The body callback registers ordered evaluate/instruct steps via
 * {@link evaluate} / {@link instruct}. The callback receives the
 * newly-created {@link ActionNode} — assign `a.description`,
 * `a.retries`, etc. directly.
 *
 * @example
 * ```ts
 * action("Authenticate", (a) => {
 *   a.retries = 2;
 *   a.description = "Authenticate the current user.";
 *   evaluate(`${userId} is set`);
 *   instruct(`Read auth token for ${userId} and write it to ${authToken}.`);
 * });
 * ```
 *
 * @param name - The action's name. Used as a key-mangling prefix for any
 *   {@link variable} / {@link constant} calls made inside the body.
 * @param body - Body callback. Register steps via {@link evaluate} /
 *   {@link instruct} calls in the order they should run.
 *
 * @returns The created {@link ActionNode}.
 */
export function action(
	name: string,
	body: (node: ActionNode) => void,
): ActionNode {
	const node = new ActionNode(name);
	compositeParent()?.children.push(node);
	pushAction(node);
	try {
		body(node);
	} finally {
		popFrame();
	}
	return node;
}
