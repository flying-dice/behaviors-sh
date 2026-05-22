// Implicit-frame stack threaded through composite/action body callbacks.
// Body code calling `evaluate()` / `instruct()` / `variable()` / `constant()`
// looks up the current frame here and mutates it directly.

import type { ActionNode } from "./nodes/action-node.ts";
import type { CompositeNode } from "./nodes/composite-node.ts";

type Frame =
	| { kind: "composite"; node: CompositeNode }
	| { kind: "action"; node: ActionNode };

const stack: Frame[] = [];

export function pushComposite(node: CompositeNode): void {
	stack.push({ kind: "composite", node });
}

export function pushAction(node: ActionNode): void {
	stack.push({ kind: "action", node });
}

export function popFrame(): void {
	stack.pop();
}

// Top frame or `undefined` if the stack is empty (module-scope call site).
export function currentFrame(): Frame | undefined {
	return stack[stack.length - 1];
}

// The current composite the body is registering children into. Returns
// `null` at module scope (no parent). Throws if the top frame is an
// action — composite registration is illegal inside an action body.
export function compositeParent(): CompositeNode | null {
	const top = currentFrame();
	if (!top) return null;
	if (top.kind !== "composite") {
		throw new Error(
			`expected a composite parent, got <${top.node.type}> "${top.node.name}"`,
		);
	}
	return top.node;
}

// The current action the body is registering steps into. Throws if the
// top frame is missing or not an action — `evaluate()` / `instruct()` are
// only meaningful inside an action body.
export function actionFrame(): ActionNode {
	const top = currentFrame();
	if (!top || top.kind !== "action") {
		throw new Error("evaluate()/instruct() must be inside action()");
	}
	return top.node;
}
