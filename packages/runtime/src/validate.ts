// Runtime-side tree-file validation and normalisation.
//
// `validateRootNode` throws plain `Error`s so embedders can catch them.
// The CLI wraps the throw at the boundary; it is NOT the runtime's job
// to terminate the process.

import { BehaviourNodeSchema } from "@behaviors-sh/spec";
import type { z } from "zod";
import type {
	BehaviourNode,
	NormalizedNode,
	NormalizedStep,
	Step,
} from "./types.ts";

// Re-exported under the abtree-compatible name for callers that import
// `AbtNodeSchema`. The underlying schema is `BehaviourNodeSchema` from
// `@behaviors-sh/spec`.
export { BehaviourNodeSchema as AbtNodeSchema } from "@behaviors-sh/spec";
export { BehaviourNodeSchema };

export function validateRootNode(raw: unknown): BehaviourNode {
	const result = BehaviourNodeSchema.safeParse(raw);
	if (!result.success) {
		const issues = result.error.issues
			.map((i: z.core.$ZodIssue) => {
				const path = i.path.length ? i.path.join(".") : "(root)";
				return `  ${path}: ${i.message}`;
			})
			.join("\n");
		throw new Error(`tree file failed validation:\n${issues}`);
	}
	return result.data;
}

export function normalizeStep(step: Step): NormalizedStep {
	if ("evaluate" in step)
		return { kind: "evaluate", expression: step.evaluate.trim() };
	return { kind: "instruct", instruction: step.instruct.trim() };
}

export function normalizeNode(node: BehaviourNode): NormalizedNode {
	if ("$ref" in node) {
		return { type: "ref", ref: node.$ref };
	}
	if (node.type === "action") {
		return {
			type: "action",
			name: node.name,
			steps: node.steps.map(normalizeStep),
			...(node.retries !== undefined ? { retries: node.retries } : {}),
			...(node.state !== undefined ? { state: node.state } : {}),
		};
	}
	return {
		type: node.type,
		name: node.name,
		children: node.children.map(normalizeNode),
		...(node.retries !== undefined ? { retries: node.retries } : {}),
		...(node.state !== undefined ? { state: node.state } : {}),
	};
}
