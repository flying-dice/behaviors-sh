import type { BehaviourNode } from "@behaviors-sh/spec";
import { cleanCodeReview } from "@behaviors-sh/tree-clean-code-review";
import { codeReview } from "@behaviors-sh/tree-code-review";
import { helloWorld } from "@behaviors-sh/tree-hello-world";
import { refinePlan } from "@behaviors-sh/tree-refine-plan";
import { countNodes } from "./behaviour-layout";

// Example trees live as standalone workspace packages under `/trees/<slug>`
// so they can be published, versioned, and edited independently. Each
// package exports a DSL-built node; we serialise it through `toJson()`
// (which validates against BehaviourNodeSchema) and parse back to a plain
// BehaviourNode. Everything the Quick Start menu shows — title, tagline,
// summary, version, node count, shape — is derived from that node. The
// only out-of-band metadata is the accent/glyph used for visual
// differentiation, which lives in a per-id override table below with a
// sensible fallback.

export type ExampleAccent = "amber" | "emerald" | "sky" | "rose" | "violet";

interface PresentationOverride {
	accent: ExampleAccent;
	glyph: string;
}

const FALLBACK_PRESENTATION: PresentationOverride = {
	accent: "violet",
	glyph: "◆",
};

const PRESENTATION_OVERRIDES: Record<string, PresentationOverride> = {
	"hello-world": { accent: "amber", glyph: "✦" },
	"code-review": { accent: "sky", glyph: "❖" },
	"clean-code-review": { accent: "emerald", glyph: "◈" },
	"refine-plan-workflow": { accent: "rose", glyph: "⤿" },
};

export interface QuickStartExample {
	id: string;
	title: string;
	tagline: string;
	summary: string;
	version: string;
	accent: ExampleAccent;
	glyph: string;
	node: BehaviourNode;
}

// `Hello_World` → `hello-world`. Used as the default workspace key and
// the lookup key into the override table.
function slugify(name: string): string {
	return name
		.replace(/[_\s]+/g, "-")
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.toLowerCase()
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

// `Refine_Plan_Workflow` → `Refine plan workflow`. First word capitalised,
// the rest lower-cased so it reads as a human title rather than a
// PascalCase identifier.
function humanize(name: string): string {
	const words = name.split(/[_\s]+/).filter(Boolean);
	if (words.length === 0) return name;
	return [
		words[0]!.charAt(0).toUpperCase() + words[0]!.slice(1).toLowerCase(),
		...words.slice(1).map((w) => w.toLowerCase()),
	].join(" ");
}

// Derive a short tagline from the description by cutting at the first
// natural break — colon, sentence end, or em-dash. Falls back to a length-
// capped slice if no break is present, so the list row stays one line.
function deriveTagline(description: string): string {
	const breaks = [": ", ". ", " — ", " – "]
		.map((sep) => description.indexOf(sep))
		.filter((i) => i > 0);
	if (breaks.length === 0) {
		return description.length > 90
			? `${description.slice(0, 87).trim()}…`
			: description;
	}
	return `${description.slice(0, Math.min(...breaks)).trim()}.`;
}

function toExample(dslTree: { toJson(): string }): QuickStartExample {
	const node = JSON.parse(dslTree.toJson()) as BehaviourNode;
	if ("$ref" in node) {
		throw new Error(
			"Quick start examples must be concrete trees, not $ref roots.",
		);
	}
	const id = slugify(node.name);
	const description = node.description ?? "";
	const presentation = PRESENTATION_OVERRIDES[id] ?? FALLBACK_PRESENTATION;
	return {
		id,
		title: humanize(node.name),
		tagline: description ? deriveTagline(description) : node.name,
		summary: description || "No description provided.",
		version: node.version ?? "—",
		accent: presentation.accent,
		glyph: presentation.glyph,
		node,
	};
}

export const QUICK_START_EXAMPLES: QuickStartExample[] = [
	toExample(helloWorld),
	toExample(codeReview),
	toExample(cleanCodeReview),
	toExample(refinePlan),
];

export function exampleNodeCount(ex: QuickStartExample): number {
	return countNodes(ex.node);
}

export interface ExampleShapeRow {
	indent: number;
	kind: "sequence" | "selector" | "parallel" | "action" | "ref";
	label: string;
	isLast: boolean;
}

export function exampleShape(node: BehaviourNode): ExampleShapeRow[] {
	const rows: ExampleShapeRow[] = [];
	function walk(n: BehaviourNode, depth: number, isLast: boolean) {
		if ("$ref" in n) {
			rows.push({ indent: depth, kind: "ref", label: n.$ref, isLast });
			return;
		}
		rows.push({ indent: depth, kind: n.type, label: n.name, isLast });
		if (n.type !== "action") {
			n.children.forEach((c, i) => {
				walk(c, depth + 1, i === n.children.length - 1);
			});
		}
	}
	walk(node, 0, true);
	return rows;
}
