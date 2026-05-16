#!/usr/bin/env bun
import { Command, InvalidArgumentError } from 'commander'
import { startServer } from '@behaviors-ui/server'
import { assets } from './embedded-assets.ts'
import pkg from '../package.json' with { type: 'json' }

function intArg(name: string) {
  return (value: string) => {
    const n = Number.parseInt(value, 10)
    if (!Number.isFinite(n) || n < 0) {
      throw new InvalidArgumentError(`${name} must be a non-negative integer`)
    }
    return n
  }
}

interface CliOptions {
  headless?: boolean
  port?: number
  host?: string
  title: string
  width: number
  height: number
  devtools?: boolean
}

function pickFreePort(): number {
  const s = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: () => new Response('') })
  const p = s.port ?? 0
  s.stop(true)
  return p
}

async function waitForUrl(url: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now()
  let lastErr: unknown
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(500) })
      if (res.status < 500) return
    } catch (err) {
      lastErr = err
    }
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error(`server did not become ready at ${url}: ${lastErr}`)
}

async function runHeadless(opts: CliOptions): Promise<void> {
  const running = startServer({
    port: opts.port,
    hostname: opts.host,
    embeddedAssets: assets,
  })

  const shutdown = async (code = 0) => {
    try {
      await running.stop()
    } catch {}
    process.exit(code)
  }
  process.on('SIGINT', () => shutdown(130))
  process.on('SIGTERM', () => shutdown(143))

  console.log(`[cli] headless mode — serving at ${running.url} (Ctrl+C to stop)`)
}

// TODO: 8 - SRP: runWebview conflates port discovery, server polling, process lifecycle, and webview management
async function runWebview(opts: CliOptions): Promise<void> {
  let Webview: typeof import('webview-bun').Webview
  try {
    ;({ Webview } = await import('webview-bun'))
  } catch (err) {
    console.error('[cli] could not load native webview bindings:', (err as Error).message)
    console.error('[cli] falling back to headless mode')
    await runHeadless(opts)
    return
  }

  // Webview's native event loop blocks the JS thread on macOS (Cocoa requires
  // the main thread), so run the server in a child process. Re-spawn this same
  // entry point with --headless; works in both dev (bun src/index.ts) and the
  // compiled binary (./behaviors-ui).
  const host = opts.host ?? '127.0.0.1'
  const port = opts.port ?? pickFreePort()
  const url = `http://${host}:${port}`

  const isCompiled = !import.meta.url.endsWith('.ts')
  const childArgs = ['--headless', '--port', String(port), '--host', host]
  const cmd = isCompiled
    ? [process.execPath, ...childArgs]
    : [process.execPath, process.argv[1]!, ...childArgs]

  const child = Bun.spawn(cmd, { stdout: 'inherit', stderr: 'inherit' })

  const shutdown = (code = 0) => {
    try {
      child.kill()
    } catch {}
    process.exit(code)
  }
  process.on('SIGINT', () => shutdown(130))
  process.on('SIGTERM', () => shutdown(143))

  try {
    await waitForUrl(`${url}/api/health`)
  } catch (err) {
    console.error('[cli]', (err as Error).message)
    shutdown(1)
    return
  }
  console.log(`[cli] server (child) listening on ${url}`)

  const w = new Webview(opts.devtools ?? false, {
    width: opts.width,
    height: opts.height,
    hint: 0,
  })
  w.title = opts.title
  w.navigate(url)
  try {
    w.run()
  } finally {
    shutdown(0)
  }
}

const program = new Command()
  .name('behaviors-ui')
  .description(
    'Run the behaviors UI as a desktop webview or a headless server.\n\n' +
      '  (default)   open the UI in a native webview window\n' +
      '  --headless  start the server only (no GUI)',
  )
  .version(pkg.version, '-v, --version')
  .option('--headless', 'run the server without a GUI window')
  .option('-p, --port <n>', 'port to listen on (default: 3000, or $PORT)', intArg('port'))
  .option('-H, --host <name>', 'hostname to bind', '127.0.0.1')
  .option('--title <s>', 'webview window title', 'Behaviors UI')
  .option('--width <n>', 'webview window width', intArg('width'), 1280)
  .option('--height <n>', 'webview window height', intArg('height'), 800)
  .option('--devtools', 'enable webview devtools (right-click → Inspect Element)')
  .action(async (opts: CliOptions) => {
    if (opts.headless) await runHeadless(opts)
    else await runWebview(opts)
  })

await program.parseAsync(process.argv)
