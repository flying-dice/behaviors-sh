import { describe, expect, test } from "bun:test";
import {
    BehaviourNodeSchema,
    ActionNodeSchema,
    CompositeNodeSchema,
    RefNodeSchema,
    StepSchema,
} from "./index";

describe("BehaviourNodeSchema.toJSONSchema", () => {
    test("emits the published JSON Schema", () => {
        expect(
            (BehaviourNodeSchema as any).toJSONSchema({ target: "draft-2020-12" }),
        ).toMatchSnapshot();
    });

    test("declares the draft-2020-12 dialect via zod, not by hand", () => {
        const schema = (BehaviourNodeSchema as any).toJSONSchema({
            target: "draft-2020-12",
        }) as { $schema?: string; $id?: string; title?: string };
        expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
        expect(schema.$id).toBe("https://behaviors-ui.dev/schemas/tree.schema.json");
        expect(schema.title).toBe("Behaviour Tree File");
    });
});

describe("StepSchema", () => {
    test("accepts an evaluate step", () => {
        expect(StepSchema.parse({ evaluate: "x > 0" })).toEqual({ evaluate: "x > 0" });
    });

    test("accepts an instruct step", () => {
        expect(StepSchema.parse({ instruct: "do the thing" })).toEqual({
            instruct: "do the thing",
        });
    });

    test("rejects empty string bodies", () => {
        expect(StepSchema.safeParse({ evaluate: "" }).success).toBe(false);
        expect(StepSchema.safeParse({ instruct: "" }).success).toBe(false);
    });
});

describe("RefNodeSchema", () => {
    test("parses a $ref node", () => {
        expect(RefNodeSchema.parse({ $ref: "@scope/pkg" })).toEqual({
            $ref: "@scope/pkg",
        });
    });
});

describe("ActionNodeSchema", () => {
    test("parses a minimal action", () => {
        const node = {
            type: "action" as const,
            name: "greet",
            steps: [{ evaluate: "true" }],
        };
        expect(ActionNodeSchema.parse(node)).toEqual(node);
    });

    test("parses an action with full metadata", () => {
        const node = {
            type: "action" as const,
            name: "greet",
            steps: [{ instruct: "say hi" }],
            retries: 3,
            $schema: "https://behaviors-ui.dev/schemas/tree.schema.json",
            version: "1.0.0",
            description: "greet the user",
            state: { var: { count: 0 }, const: { greeting: "hello" } },
        };
        expect(ActionNodeSchema.parse(node)).toEqual(node);
    });

    test("rejects a name containing '/' or '@'", () => {
        const result = ActionNodeSchema.safeParse({
            type: "action",
            name: "@scope/foo",
            steps: [{ evaluate: "true" }],
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toMatchSnapshot();
    });

    test("rejects an empty steps array", () => {
        const result = ActionNodeSchema.safeParse({
            type: "action",
            name: "noop",
            steps: [],
        });
        expect(result.success).toBe(false);
    });

    test("rejects retries < 1 and non-integer retries", () => {
        const base = {
            type: "action" as const,
            name: "noop",
            steps: [{ evaluate: "true" }],
        };
        expect(ActionNodeSchema.safeParse({ ...base, retries: 0 }).success).toBe(false);
        expect(ActionNodeSchema.safeParse({ ...base, retries: 1.5 }).success).toBe(
            false,
        );
    });
});

describe("CompositeNodeSchema", () => {
    test.each(["sequence", "selector", "parallel"] as const)(
        "parses a %s with one action child",
        (type) => {
            const node = {
                type,
                name: `${type}-root`,
                children: [
                    {
                        type: "action" as const,
                        name: "leaf",
                        steps: [{ evaluate: "true" }],
                    },
                ],
            };
            expect(CompositeNodeSchema.parse(node)).toEqual(node);
        },
    );

    test("parses a deeply nested tree", () => {
        const tree = {
            type: "sequence" as const,
            name: "root",
            children: [
                {
                    type: "selector" as const,
                    name: "fallback",
                    children: [
                        {
                            type: "action" as const,
                            name: "try-a",
                            steps: [{ evaluate: "a()" }],
                        },
                        { $ref: "@vendor/shared-fallback" },
                    ],
                },
            ],
        };
        expect(CompositeNodeSchema.parse(tree)).toEqual(tree);
    });

    test("rejects an empty children array", () => {
        const result = CompositeNodeSchema.safeParse({
            type: "sequence",
            name: "empty",
            children: [],
        });
        expect(result.success).toBe(false);
    });
});

describe("BehaviourNodeSchema", () => {
    test("accepts an action at the root", () => {
        const node = {
            type: "action" as const,
            name: "root",
            steps: [{ evaluate: "true" }],
        };
        expect(BehaviourNodeSchema.parse(node)).toEqual(node);
    });

    test("accepts a ref at the root", () => {
        expect(BehaviourNodeSchema.parse({ $ref: "@vendor/pkg" })).toEqual({
            $ref: "@vendor/pkg",
        });
    });

    test("rejects an unknown node type", () => {
        const result = BehaviourNodeSchema.safeParse({
            type: "decorator",
            name: "x",
            children: [],
        });
        expect(result.success).toBe(false);
    });
});
