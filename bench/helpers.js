import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const CacheDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.cache')

export function getCacheLocationForCid(cid) {
  return `${CacheDir}/${cid}.bin`
}

export function resolveImportRelative(importMetaUrl, modulePath) {
  return path.resolve(path.dirname(fileURLToPath(importMetaUrl)), modulePath)
}
