// Re-exports from @behaviors-sh/spec (the canonical execution-document
// + tree schemas) plus runtime-internal types (`TickResult`) that
// describe the tick engine's emit shape and don't belong in the
// cross-package spec.

export type {
	ActionNode,
	BehaviourNode,
	CompositeNode,
	NodeState,
	NormalizedActionNode,
	NormalizedCompositeNode,
	NormalizedNode,
	NormalizedRefNode,
	NormalizedStep,
	ParsedTree,
	RefNode,
	Step,
} from "@behaviors-sh/spec";
export {
	EXECUTION_SCHEMA_VERSION,
	type ExecutionDocument,
	type ExecutionPhase,
	type ExecutionStatus,
	type NodeStatus,
	type RuntimeState,
	type TraceEntry,
	type TraceKind,
} from "@behaviors-sh/spec";

export type TickResult =
	| {
			type: "evaluate";
			name: string;
			expression: string;
			path: number[];
			step: number;
	  }
	| {
			type: "instruct";
			name: string;
			instruction: string;
			path: number[];
			step: number;
	  }
	| { type: "done" }
	| { type: "failure" };
