import $RefParser from "@apidevtools/json-schema-ref-parser";
import type { BehaviourNode, Workspace } from "@behaviors-ui/spec";

// Returns a copy of the tree at `treeId` with internal `$ref`s expanded
// inline. Circular references are left as `$ref` strings so YAML
// serialisation can't loop forever.
//
// Dereferencing runs against a deep clone of the workspace so the live
// state is never mutated. If ref-parser throws (e.g. a dangling ref),
// the un-dereffed clone is returned and the caller's YAML will still
// render — just with the bare `$ref` strings.
export async function dereferenceTree(
    workspace: Workspace,
    treeId: string,
): Promise<BehaviourNode | null> {
    // JSON round-trip rather than structuredClone — the live workspace
    // is a Svelte 5 $state proxy and cannot be cloned structurally.
    // Workspace data is plain JSON (strings/numbers/booleans/objects),
    // so JSON.stringify is sufficient.
    const clone = JSON.parse(JSON.stringify(workspace)) as Workspace;
    try {
        await $RefParser.dereference(clone as unknown as object, {
            dereference: { circular: "ignore" },
        });
    } catch {
        // Swallow — fall through to the un-dereffed clone below.
    }
    const tree = (clone.components.trees as Record<string, BehaviourNode>)[
        treeId
    ];
    return tree ?? null;
}
