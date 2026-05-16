import { z } from "zod";

export const StepSchema = z.union([
    z.object({ evaluate: z.string().min(1) }),
    z.object({ instruct: z.string().min(1) }),
]);

const RetriesSchema = z.int().min(1).optional();

export const NAME_PATTERN = /^[^/@]+$/;

const NodeNameSchema = z
    .string()
    .min(1)
    .regex(NAME_PATTERN, "node name must not contain '/' or '@'");

const StateSchema = z
    .object({
        var: z.record(z.string(), z.unknown()).optional(),
        const: z.record(z.string(), z.unknown()).optional(),
    })
    .optional();

// Optional metadata that any node can carry. The runtime only consults
// these at the execution-root level; on inner nodes they round-trip
// untouched (useful for fragments that ship as standalone packages).
const NodeMetaSchema = {
    $schema: z.string().optional(),
    version: z.string().optional(),
    description: z.string().optional(),
    state: StateSchema,
};

export const RefNodeSchema = z.object({
    $ref: z.string(),
});

export const ActionNodeSchema = z.object({
    type: z.literal("action"),
    name: NodeNameSchema,
    steps: z.array(StepSchema).min(1),
    retries: RetriesSchema,
    ...NodeMetaSchema,
});

// Composite has a recursive `children` field. Define the non-recursive
// shape first, infer the base type from it, then extend with the
// self-referential children — that way every property except the
// recursion bridge is sourced from the schema.
const CompositeNodeBaseSchema = z.object({
    type: z.enum(["sequence", "selector", "parallel"]),
    name: NodeNameSchema,
    retries: RetriesSchema,
    ...NodeMetaSchema,
});

export type Step = z.infer<typeof StepSchema>;

export type StepKind = "evaluate" | "instruct";

export function stepKind(step: Step): StepKind {
    return "evaluate" in step ? "evaluate" : "instruct";
}

export function stepBody(step: Step): string {
    return "evaluate" in step ? step.evaluate : step.instruct;
}

export type RefNode = z.infer<typeof RefNodeSchema>;
export type ActionNode = z.infer<typeof ActionNodeSchema>;
export type CompositeNode = z.infer<typeof CompositeNodeBaseSchema> & {
    children: BehaviourNode[];
};
export type BehaviourNode = ActionNode | CompositeNode | RefNode;

export const CompositeNodeSchema: z.ZodType<CompositeNode> =
    CompositeNodeBaseSchema.extend({
        children: z.array(z.lazy(() => BehaviourNodeSchema)).min(1),
    });

export const BehaviourNodeSchema: z.ZodType<BehaviourNode> = z
    .lazy(() => z.union([RefNodeSchema, ActionNodeSchema, CompositeNodeSchema]))
    .meta({
        $id: "https://behaviors-ui.dev/schemas/tree.schema.json",
        title: "Behaviour Tree File",
        description:
            "Schema for behaviour-tree YAML files. The file root is a node — there is no wrapper. Optional `version`, `description`, and `state` fields can appear on any node so fragments and trees share one shape. Reference via `# yaml-language-server: $schema=...` or `$schema:` field.",
    });
