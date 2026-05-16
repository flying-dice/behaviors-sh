import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

function walk(dir: string, out: string[] = []): string[] {
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full, out)
      else out.push(full)
    }
  } catch {
    // dist may not exist yet during initial dev runs
  }
  return out
}

export function readClientDist(): Record<string, { b64: string; type: string }> {
  const root = new URL('../../client/dist', import.meta.url).pathname
  const out: Record<string, { b64: string; type: string }> = {}
  for (const file of walk(root)) {
    const rel = '/' + relative(root, file).split('\\').join('/')
    const ext = extname(file).toLowerCase()
    out[rel] = {
      b64: readFileSync(file).toString('base64'),
      type: MIME[ext] ?? 'application/octet-stream',
    }
  }
  return out
}
