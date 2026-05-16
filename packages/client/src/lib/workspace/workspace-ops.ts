import { NAME_PATTERN, type BehaviourNode, type Workspace } from "@behaviors-ui/behavior-spec";

export function assertValidTreeKey(id: string): void {
    if (!id || !NAME_PATTERN.test(id)) {
        throw new Error(
            `Invalid tree id "${id}". Must be non-empty and contain no '/' or '@'.`,
        );
    }
}

// TODO: 4 - DRY: createTreeIn and replaceTreeIn share identical components.trees spread; extract withTrees helper
export function createTreeIn(ws: Workspace, id: string, node: BehaviourNode): Workspace {
    assertValidTreeKey(id);
    if (ws.components.trees[id]) {
        throw new Error(`A tree with id "${id}" already exists.`);
    }
    return {
        ...ws,
        components: {
            ...ws.components,
            trees: { ...ws.components.trees, [id]: node },
        },
    };
}

export function replaceTreeIn(ws: Workspace, id: string, node: BehaviourNode): Workspace {
    if (!(id in ws.components.trees)) {
        throw new Error(`No tree with id "${id}".`);
    }
    return {
        ...ws,
        components: {
            ...ws.components,
            trees: { ...ws.components.trees, [id]: node },
        },
    };
}

export function renameTreeIn(ws: Workspace, oldId: string, newId: string): Workspace {
    if (oldId === newId) return ws;
    assertValidTreeKey(newId);
    const trees = ws.components.trees;
    if (!(oldId in trees)) throw new Error(`No tree with id "${oldId}".`);
    if (newId in trees) {
        throw new Error(`A tree with id "${newId}" already exists.`);
    }
    const next: Record<string, BehaviourNode> = {};
    for (const [k, v] of Object.entries(trees)) {
        next[k === oldId ? newId : k] = v;
    }
    return { ...ws, components: { ...ws.components, trees: next } };
}

export function deleteTreeIn(ws: Workspace, id: string): Workspace {
    if (!(id in ws.components.trees)) return ws;
    const { [id]: _removed, ...rest } = ws.components.trees;
    return { ...ws, components: { ...ws.components, trees: rest } };
}

export function findTreeRefsIn(ws: Workspace, id: string): string[] {
    const target = `#/components/trees/${id}`;
    const hits: string[] = [];
    function walk(node: BehaviourNode, path: string) {
        if ("$ref" in node) {
            if (node.$ref === target) hits.push(path);
            return;
        }
        if (node.type === "action") return;
        node.children.forEach((c, i) => walk(c, `${path}/children/${i}`));
    }
    for (const [k, v] of Object.entries(ws.components.trees)) {
        if (k === id) continue;
        walk(v, `#/components/trees/${k}`);
    }
    return hits;
}
