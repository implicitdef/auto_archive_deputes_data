import path = require('path')
import { DATA_DIR } from './nosdeputesFetch'
import { readFileAsJson5 } from './utils'

export function readAliases() {
  const aliasesFile = path.join(DATA_DIR, 'hardcoded', 'aliases.json5')
  const aliases = readFileAsJson5(aliasesFile)
  return aliases as string[][]
}

export function readKnownDeputesWithoutWikipediaPage() {
  return readHardcodedWikipediaInfo().deputesWithoutWikipediaPage
}
export function readHardcodedDeputesUrls() {
  return readHardcodedWikipediaInfo().hardcodedDeputesUrls
}

function readHardcodedWikipediaInfo() {
  const aliasesFile = path.join(
    DATA_DIR,
    'hardcoded',
    'hardcodedWikipediaInfo.json5',
  )
  const json = readFileAsJson5(aliasesFile) as {
    hardcodedDeputesUrls: { [anId: string]: string }
    deputesWithoutWikipediaPage: string[]
  }
  return json
}
