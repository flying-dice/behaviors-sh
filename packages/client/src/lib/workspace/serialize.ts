import {
    BehaviourNodeSchema,
    WorkspaceSchema,
    type BehaviourNode,
    type Workspace,
} from "@behaviors-ui/spec";
import { parse as parseYaml } from "yaml";

export function serializeWorkspace(ws: Workspace): string {
    return `${JSON.stringify(ws, null, 2)}\n`;
}

export function parseWorkspace(text: string): Workspace {
    const raw = JSON.parse(text);
    return WorkspaceSchema.parse(raw);
}

export function parseTreeFile(text: string, filename: string): BehaviourNode {
    const ext = filename.split(".").pop()?.toLowerCase();
    const raw = ext === "yaml" || ext === "yml" ? parseYaml(text) : JSON.parse(text);
    return BehaviourNodeSchema.parse(raw);
}

export function slugify(s: string, fallback = "item"): string {
    return (
        s
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "") || fallback
    );
}

export function treeIdFromNode(node: BehaviourNode, filename: string): string {
    if (!("$ref" in node) && node.name) return node.name;
    return slugify(filename.replace(/\.(ya?ml|json)$/i, ""), "imported-tree");
}

export interface PickedTree {
    node: BehaviourNode;
    id: string;
}

export async function pickAndParseTree(): Promise<PickedTree | null> {
    const { pickTreeFile } = await import("./storage/device");
    const picked = await pickTreeFile();
    if (!picked) return null;
    const node = parseTreeFile(picked.text, picked.filename);
    const id = treeIdFromNode(node, picked.filename);
    return { node, id };
}

export function emptyWorkspace(name: string, version = "0.1.0"): Workspace {
    return WorkspaceSchema.parse({
        name,
        version,
        components: { trees: {} },
    });
}
