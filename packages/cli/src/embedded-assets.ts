import type { EmbeddedAsset } from '@behaviors-sh/server'
import { readClientDist } from './embed.macro.ts' with { type: 'macro' }

export type { EmbeddedAsset }

const raw = readClientDist()

export const assets: Record<string, EmbeddedAsset> = Object.fromEntries(
  Object.entries(raw).map(([path, { b64, type }]) => [
    path,
    { data: Buffer.from(b64, 'base64'), contentType: type },
  ]),
)

export const hasEmbeddedAssets = Object.keys(assets).length > 0
