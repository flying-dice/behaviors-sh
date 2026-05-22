import { z } from "zod";
import { BehaviourNodeSchema, NAME_PATTERN } from "./tree";

const TreeKeySchema = z
    .string()
    .min(1)
    .regex(NAME_PATTERN, "tree key must not contain '/' or '@'");

export const ComponentsSchema = z.object({
    trees: z.record(TreeKeySchema, BehaviourNodeSchema),
});

export const WorkspaceSchema = z
    .object({
        name: z.string().min(1),
        version: z.string().min(1),
        components: ComponentsSchema,
    })
    .meta({
        $id: "https://behaviors-ui.dev/schemas/workspace.schema.json",
        title: "Behaviour Workspace File",
        description:
            "A workspace bundles named behaviour trees under an OpenAPI-style `components` namespace. Each entry under `components.trees` is a BehaviourNode. Anywhere a node is expected — as a whole tree or inside a composite's `children` — `$ref` can stand in for it and point to another tree in the workspace (`#/components/trees/<id>`) or to a file/URL. Resolution is performed by `@apidevtools/json-schema-ref-parser` at load time, so the schema only requires that `$ref` is a non-empty string.",
    });

export type Components = z.infer<typeof ComponentsSchema>;

export type Workspace = z.infer<typeof WorkspaceSchema>;
