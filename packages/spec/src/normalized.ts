// Normalized shapes — the post-validate / post-normalize representation
// of a behaviour tree that the runtime stores in execution documents.
// The runtime owns the *normalize* function; spec owns the *types* so
// the execution-document schema can describe its `tree:` field
// precisely without depending on the runtime package.

export type NormalizedStep =
	| { kind: "evaluate"; expression: string }
	| { kind: "instruct"; instruction: string };

export type NodeState = {
	var?: Record<string, unknown>;
	const?: Record<string, unknown>;
};

export type NormalizedActionNode = {
	type: "action";
	name: string;
	steps: NormalizedStep[];
	retries?: number;
	state?: NodeState;
};

export type NormalizedCompositeNode = {
	type: "sequence" | "selector" | "parallel";
	name: string;
	children: NormalizedNode[];
	retries?: number;
	state?: NodeState;
};

export type NormalizedRefNode = {
	type: "ref";
	ref: string;
};

export type NormalizedNode =
	| NormalizedActionNode
	| NormalizedCompositeNode
	| NormalizedRefNode;

// The parsed tree is the root node directly. The optional `state` field
// on the root is read once at execution-create to seed `doc.var` /
// `doc.const`; thereafter only the live scopes are mutated (`doc.var`
// is read/write throughout the run; `doc.const` is never written after
// create — there is no runtime path that mutates it).
export type ParsedTree = NormalizedNode;
