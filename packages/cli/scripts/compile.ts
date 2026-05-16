import { $ } from 'bun'
import { resolve } from 'node:path'

const workspaceRoot = resolve(import.meta.dir, '../../..')
const cliRoot = resolve(import.meta.dir, '..')

const outfile = process.argv[2] ?? 'dist/behaviors-ui'

console.log('[compile] building client...')
await $`bun --filter @behaviors-ui/client build`.cwd(workspaceRoot)

console.log(`[compile] compiling cli → ${outfile} ...`)
await $`bun build --compile src/index.ts --outfile ${outfile}`.cwd(cliRoot)

console.log(`[compile] done — packages/cli/${outfile}`)
