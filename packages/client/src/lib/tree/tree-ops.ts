import { stepKind, type ActionNode, type BehaviourNode, type RefNode, type Step } from '@behaviors-ui/spec';

export type CompositeType = 'sequence' | 'selector' | 'parallel';
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
    compositeType: CompositeType,
    wrapperName: string,
): BehaviourNode {
    return updateAt(root, path, (node) => ({
        type: compositeType,
        name: wrapperName,
        children: [node],
    }));
}

const SEED_INSTRUCT: Step = { instruct: 'TODO: describe step.' };

export function defaultAction(name = 'step'): BehaviourNode {
    return {
        type: 'action',
        name,
        steps: [SEED_INSTRUCT],
    };
}

export function defaultComposite(type: CompositeType, name: string): BehaviourNode {
    return { type, name, children: [defaultAction()] };
}

// Returns the parent's path, or null if `path` is the root.
export function parentOf(path: Path): Path | null {
    if (path.length === 0) return null;
    return path.slice(0, -1);
}

export function setName(node: BehaviourNode, name: string): BehaviourNode {
    return '$ref' in node ? node : { ...node, name };
}

export function setDescription(node: BehaviourNode, description: string): BehaviourNode {
    if ('$ref' in node) return node;
    return { ...node, description: description.trim() || undefined };
}

export function setRetries(node: BehaviourNode, text: string): BehaviourNode {
    if ('$ref' in node) return node;
    const trimmed = text.trim();
    if (!trimmed) return { ...node, retries: undefined };
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1) return node;
    return { ...node, retries: parsed };
}

export function setCompositeType(node: BehaviourNode, type: CompositeType): BehaviourNode {
    if ('$ref' in node || node.type === 'action') return node;
    return { ...node, type };
}

export function setRef(node: BehaviourNode, value: string): BehaviourNode {
    return '$ref' in node ? { $ref: value } : node;
}

export function addStep(node: BehaviourNode, kind: 'evaluate' | 'instruct'): BehaviourNode {
    if ('$ref' in node || node.type !== 'action') return node;
    const seed: Step = kind === 'evaluate' ? { evaluate: 'true' } : SEED_INSTRUCT;
    return { ...node, steps: [...node.steps, seed] };
}

export function removeStep(node: BehaviourNode, idx: number): BehaviourNode {
    if ('$ref' in node || node.type !== 'action') return node;
    if (node.steps.length <= 1) return node;
    const steps = node.steps.slice();
    steps.splice(idx, 1);
    return { ...node, steps };
}

export function moveStep(node: BehaviourNode, from: number, to: number): BehaviourNode {
    if ('$ref' in node || node.type !== 'action') return node;
    if (from === to || from < 0 || to < 0 || from >= node.steps.length || to >= node.steps.length) return node;
    const steps = node.steps.slice();
    const [moved] = steps.splice(from, 1);
    steps.splice(to, 0, moved!);
    return { ...node, steps };
}

export function setStepBody(node: BehaviourNode, idx: number, value: string): BehaviourNode {
    if ('$ref' in node || node.type !== 'action') return node;
    const steps = node.steps.slice();
    const current = steps[idx]!;
    const kind = stepKind(current);
    steps[idx] = { [kind]: value } as typeof current;
    return { ...node, steps };
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
