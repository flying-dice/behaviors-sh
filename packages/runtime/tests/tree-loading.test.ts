import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	mkdirSync,
	mkdtempSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { FileSystemTreeReader, type TreeReader } from "../src/index.ts";

let tmp: string;
let treeReader: TreeReader;

beforeEach(() => {
	tmp = realpathSync(mkdtempSync(join(tmpdir(), "behaviors-sh-tree-loading-")));
	treeReader = new FileSystemTreeReader({ cwd: tmp });
});

afterEach(() => {
	rmSync(tmp, { recursive: true, force: true });
});

function write(rel: string, contents: string): string {
	const abs = join(tmp, rel);
	mkdirSync(join(abs, ".."), { recursive: true });
	writeFileSync(abs, contents);
	return abs;
}

const TRIVIAL_YAML =
	"type: action\nname: A\nsteps: [{ instruct: hi }]\nversion: 1.0.0\n";

const TRIVIAL_JSON = JSON.stringify({
	type: "action",
	name: "A",
	steps: [{ instruct: "hi" }],
	version: "1.0.0",
});

describe("FileSystemTreeReader — accepted shapes", () => {
	test("loads a relative .json path", async () => {
		write("tree.json", TRIVIAL_JSON);
		const loaded = await treeReader.read("./tree.json");
		expect(loaded?.uri).toBe("./tree.json");
		expect(loaded?.parsed.type).toBe("action");
	});

	test("loads a relative .yaml path", async () => {
		write("tree.yaml", TRIVIAL_YAML);
		const loaded = await treeReader.read("./tree.yaml");
		expect(loaded?.parsed.type).toBe("action");
	});

	test("loads a relative .yml path", async () => {
		write("tree.yml", TRIVIAL_YAML);
		const loaded = await treeReader.read("./tree.yml");
		expect(loaded?.parsed.type).toBe("action");
	});

	test("loads an absolute path", async () => {
		const abs = write("tree.json", TRIVIAL_JSON);
		const loaded = await treeReader.read(abs);
		expect(loaded?.uri).toBe(abs);
	});

	test("loads a file:// URI", async () => {
		const abs = write("tree.json", TRIVIAL_JSON);
		const uri = pathToFileURL(abs).href;
		const loaded = await treeReader.read(uri);
		expect(loaded?.uri).toBe(uri);
		expect(loaded?.parsed.type).toBe("action");
	});

	test("dereferences a relative $ref", async () => {
		write(
			"fragment.json",
			JSON.stringify({
				type: "action",
				name: "Inner",
				steps: [{ instruct: "hi" }],
			}),
		);
		write(
			"main.json",
			JSON.stringify({
				type: "sequence",
				name: "Outer",
				children: [{ $ref: "./fragment.json" }],
			}),
		);
		const loaded = await treeReader.read("./main.json");
		expect(loaded?.parsed.type).toBe("sequence");
		if (loaded?.parsed.type === "sequence") {
			const child = loaded.parsed.children[0];
			expect(child?.type).toBe("action");
		}
	});

	test("reads optional state from the root node", async () => {
		write(
			"tree.json",
			JSON.stringify({
				type: "action",
				name: "A",
				steps: [{ instruct: "hi" }],
				state: { var: { counter: 0 }, const: { lang: "en" } },
			}),
		);
		const loaded = await treeReader.read("./tree.json");
		expect(loaded?.parsed.type === "action" && loaded.parsed.state).toEqual({
			var: { counter: 0 },
			const: { lang: "en" },
		});
	});
});

describe("FileSystemTreeReader — non-matches return null", () => {
	test("returns null for a path that does not exist", async () => {
		const loaded = await treeReader.read("./does-not-exist.json");
		expect(loaded).toBeNull();
	});

	test("returns null for a directory", async () => {
		mkdirSync(join(tmp, "some-dir"));
		const loaded = await treeReader.read("./some-dir");
		expect(loaded).toBeNull();
	});

	test("returns null for a non-JSON/YAML file", async () => {
		write("readme.md", "# nope");
		const loaded = await treeReader.read("./readme.md");
		expect(loaded).toBeNull();
	});

	test("returns null for unsupported URI scheme", async () => {
		const loaded = await treeReader.read("https://example.com/tree.json");
		expect(loaded).toBeNull();
	});
});

describe("FileSystemTreeReader — slug from tree file's root-node name", () => {
	test("passes through an already-clean unscoped name", async () => {
		write(
			"tree.json",
			JSON.stringify({
				type: "action",
				name: "bt-retry",
				steps: [{ instruct: "hi" }],
			}),
		);
		const loaded = await treeReader.read("./tree.json");
		expect(loaded?.slug).toBe("bt-retry");
	});

	test("sanitises uppercase + underscores into a slug", async () => {
		write(
			"tree.json",
			JSON.stringify({
				type: "action",
				name: "Hello_World",
				steps: [{ instruct: "hi" }],
			}),
		);
		const loaded = await treeReader.read("./tree.json");
		expect(loaded?.slug).toBe("hello_world");
	});
});
