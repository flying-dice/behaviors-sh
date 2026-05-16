import { describe, expect, test } from "bun:test";
import { WorkspaceSchema } from "./index";

describe("WorkspaceSchema.toJSONSchema", () => {
    test("emits the published JSON Schema", () => {
        expect(
            (WorkspaceSchema as unknown as {
                toJSONSchema: (opts: { target: string }) => unknown;
            }).toJSONSchema({ target: "draft-2020-12" }),
        ).toMatchSnapshot();
    });

    test("advertises the workspace $id and title", () => {
        const schema = (
            WorkspaceSchema as unknown as {
                toJSONSchema: (opts: { target: string }) => {
                    $id?: string;
                    title?: string;
                };
            }
        ).toJSONSchema({ target: "draft-2020-12" });
        expect(schema.$id).toBe(
            "https://behaviors-ui.dev/schemas/workspace.schema.json",
        );
        expect(schema.title).toBe("Behaviour Workspace File");
    });
});

describe("WorkspaceSchema", () => {
    test("parses a workspace with a single handcrafted tree", () => {
        const ws = {
            name: "demo",
            version: "0.1.0",
            components: {
                trees: {
                    greet: {
                        type: "action" as const,
                        name: "greet",
                        steps: [{ instruct: "say hi" }],
                    },
                },
            },
        };
        expect(WorkspaceSchema.parse(ws)).toEqual(ws);
    });

    test("parses trees that use $ref as a whole tree and inside children", () => {
        const ws = {
            name: "demo",
            version: "1.0.0",
            components: {
                trees: {
                    greet: {
                        type: "action" as const,
                        name: "greet",
                        steps: [{ instruct: "say hi" }],
                    },
                    farewell: { $ref: "./vendor/external.yaml" },
                    compose: {
                        type: "sequence" as const,
                        name: "compose",
                        children: [
                            { $ref: "#/components/trees/greet" },
                            { $ref: "#/components/trees/farewell" },
                        ],
                    },
                },
            },
        };
        expect(WorkspaceSchema.parse(ws)).toEqual(ws);
    });

    test("rejects an empty name or version", () => {
        const base = {
            name: "demo",
            version: "1.0.0",
            components: { trees: {} },
        };
        expect(WorkspaceSchema.safeParse({ ...base, name: "" }).success).toBe(false);
        expect(WorkspaceSchema.safeParse({ ...base, version: "" }).success).toBe(
            false,
        );
    });

    test("rejects tree keys containing '/' or '@'", () => {
        const result = WorkspaceSchema.safeParse({
            name: "demo",
            version: "1.0.0",
            components: {
                trees: {
                    "@scope/foo": {
                        type: "action",
                        name: "x",
                        steps: [{ evaluate: "true" }],
                    },
                },
            },
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toMatchSnapshot();
    });

    test("rejects invalid tree values", () => {
        const result = WorkspaceSchema.safeParse({
            name: "demo",
            version: "1.0.0",
            components: {
                trees: {
                    bad: { type: "action", name: "x", steps: [] }, // empty steps
                },
            },
        });
        expect(result.success).toBe(false);
    });

    test("accepts an empty trees map", () => {
        const ws = { name: "empty", version: "0.0.0", components: { trees: {} } };
        expect(WorkspaceSchema.parse(ws)).toEqual(ws);
    });

    test("requires the components namespace", () => {
        expect(
            WorkspaceSchema.safeParse({ name: "demo", version: "1.0.0" }).success,
        ).toBe(false);
    });
});
