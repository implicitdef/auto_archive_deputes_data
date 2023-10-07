import path from 'path'
import { DATA_DIR } from '../fetchPhotos'
import { readFileAsJson, writeToFile } from '../utils'
import crypto from 'crypto'
type CacheContent = { [cacheKey: string]: string }

const cacheFileLocation = path.join(DATA_DIR, 'cache', 'cache.json')

export function readFromCache(cacheKey: string): string | undefined {
  const cache = readFileAsJson(cacheFileLocation) as CacheContent
  return cache[cacheKey] ?? undefined
}

export function writeToCache(cacheKey: string, value: string): void {
  // this is all synchronous, so in theory there should always be only one concurrent access
  const cache = readFileAsJson(cacheFileLocation) as CacheContent
  cache[cacheKey] = value
  writeToFile(cacheFileLocation, JSON.stringify(cache, null, 2))
}

export function generateCacheKey(inputString: string): string {
  const hash = crypto.createHash('md5')
  return hash.update(inputString).digest('hex')
}
