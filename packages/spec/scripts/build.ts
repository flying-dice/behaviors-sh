import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BehaviourNodeSchema, WorkspaceSchema } from "../src/index";

const distDir = resolve(import.meta.dir, "../dist");

const outputs = [
    {
        file: "tree.schema.json",
        schema: (
            BehaviourNodeSchema as unknown as {
                toJSONSchema: (opts: { target: string }) => unknown;
            }
        ).toJSONSchema({ target: "draft-2020-12" }),
    },
    {
        file: "workspace.schema.json",
        schema: (
            WorkspaceSchema as unknown as {
                toJSONSchema: (opts: { target: string }) => unknown;
            }
        ).toJSONSchema({ target: "draft-2020-12" }),
    },
];

await mkdir(distDir, { recursive: true });

for (const { file, schema } of outputs) {
    const path = resolve(distDir, file);
    await writeFile(path, `${JSON.stringify(schema, null, 2)}\n`);
    console.log(`[build] wrote ${path}`);
}
