import type { ActionNode, BehaviourNode, RefNode } from '@behaviors-ui/behavior-spec';

export type Path = number[];

export function isLeaf(node: BehaviourNode): node is ActionNode | RefNode {
    return '$ref' in node || node.type === 'action';
}

// Walk a path into the tree. Empty path means the root itself.
// Throws if the path runs off the tree or through a non-composite node.
export function getAt(root: BehaviourNode, path: Path): BehaviourNode {
    let node: BehaviourNode = root;
    for (const i of path) {
        if (isLeaf(node)) {
            throw new Error(`Path runs through leaf node at depth ${path.indexOf(i)}.`);
        }
        const child = node.children[i];
        if (!child) throw new Error(`Path index ${i} out of bounds.`);
        node = child;
    }
    return node;
}

// Immutable update at `path`. The transformer returns the replacement
// subtree (or null to delete it — handled by the caller via mapAt).
export function updateAt(
    root: BehaviourNode,
    path: Path,
    fn: (node: BehaviourNode) => BehaviourNode,
): BehaviourNode {
    if (path.length === 0) return fn(root);
    if (isLeaf(root)) {
        throw new Error('Cannot descend into leaf node.');
    }
    const [head, ...rest] = path;
    const children = root.children.slice();
    children[head] = updateAt(children[head], rest, fn);
    return { ...root, children };
}

// Returns a new tree with the node at `path` removed. If removing would
// leave a composite parent with zero children (schema requires ≥1), the
// caller is responsible for handling that case upstream — this throws.
export function removeAt(root: BehaviourNode, path: Path): BehaviourNode {
    if (path.length === 0) {
        throw new Error('Cannot remove the root.');
    }
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1]!;
    return updateAt(root, parentPath, (parent) => {
        if (isLeaf(parent)) {
            throw new Error('Parent is a leaf — nothing to remove.');
        }
        if (parent.children.length <= 1) {
            throw new Error('A composite must keep at least one child.');
        }
        const next = parent.children.slice();
        next.splice(idx, 1);
        return { ...parent, children: next };
    });
}

export function insertChild(
    root: BehaviourNode,
    parentPath: Path,
    child: BehaviourNode,
    at?: number,
): BehaviourNode {
    return updateAt(root, parentPath, (parent) => {
        if (isLeaf(parent)) {
            throw new Error('Can only add a child to a composite.');
        }
        const next = parent.children.slice();
        const idx = at ?? next.length;
        next.splice(idx, 0, child);
        return { ...parent, children: next };
    });
}

export function move(
    root: BehaviourNode,
    path: Path,
    direction: -1 | 1,
): BehaviourNode {
    if (path.length === 0) {
        throw new Error('Cannot move the root.');
    }
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1]!;
    return updateAt(root, parentPath, (parent) => {
        if (isLeaf(parent)) {
            throw new Error('Parent is a leaf.');
        }
        const next = parent.children.slice();
        const target = idx + direction;
        if (target < 0 || target >= next.length) return parent;
        const [picked] = next.splice(idx, 1);
        next.splice(target, 0, picked!);
        return { ...parent, children: next };
    });
}

export function wrap(
    root: BehaviourNode,
    path: Path,
    compositeType: 'sequence' | 'selector' | 'parallel',
    wrapperName: string,
): BehaviourNode {
    return updateAt(root, path, (node) => ({
        type: compositeType,
        name: wrapperName,
        children: [node],
    }));
}

export function defaultAction(name = 'step'): BehaviourNode {
    return {
        type: 'action',
        name,
        // TODO: 6 - DRY: this seed step literal is duplicated in NewTreeDialog.svelte and TreeEditor.svelte
        steps: [{ instruct: 'TODO: describe step.' }],
    };
}

// Returns the parent's path, or null if `path` is the root.
export function parentOf(path: Path): Path | null {
    if (path.length === 0) return null;
    return path.slice(0, -1);
}

export function pathsEqual(a: Path, b: Path): boolean {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
}

// Has `b` got `a` as a prefix? Used to keep the selection valid after
// the tree changes — if the selected path was descended from a node
// that just moved/disappeared, the caller can fall back to its parent.
export function isAncestor(a: Path, b: Path): boolean {
    if (a.length > b.length) return false;
    return a.every((v, i) => v === b[i]);
}
