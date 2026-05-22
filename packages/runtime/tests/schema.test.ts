// The tree-file schema is the BehaviourNodeSchema directly — the
// document root is a node, not a wrapper. These tests anchor that
// contract and guard against drift.
import { describe, expect, test } from "bun:test";
import { BehaviourNodeSchema } from "../src/index.ts";

const validRoot = {
	type: "action" as const,
	name: "A",
	steps: [{ instruct: "hi" }],
};

describe("BehaviourNodeSchema (root)", () => {
	test("accepts a bare action root with no metadata", () => {
		expect(BehaviourNodeSchema.safeParse(validRoot).success).toBe(true);
	});

	test("accepts a composite root with optional version + description + state", () => {
		const r = BehaviourNodeSchema.safeParse({
			type: "sequence",
			name: "Root",
			version: "1.0.0",
			description: "demo",
			state: { var: { counter: 0 } },
			children: [validRoot],
		});
		expect(r.success).toBe(true);
	});

	test("rejects a node name containing '/'", () => {
		const r = BehaviourNodeSchema.safeParse({
			...validRoot,
			name: "@scope/foo",
		});
		expect(r.success).toBe(false);
	});

	test("rejects a node name containing '@'", () => {
		const r = BehaviourNodeSchema.safeParse({
			...validRoot,
			name: "@scope-foo",
		});
		expect(r.success).toBe(false);
	});

	test("rejects the legacy wrapper shape", () => {
		const r = BehaviourNodeSchema.safeParse({
			name: "consumer",
			version: "1.0.0",
			tree: validRoot,
		});
		expect(r.success).toBe(false);
	});
});
