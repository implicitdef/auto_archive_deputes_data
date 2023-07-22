import path = require('path')
import { DATA_DIR } from './nosdeputesFetch'
import { readFileAsJson5 } from './utils'

export function readAliases() {
  const aliasesFile = path.join(DATA_DIR, 'hardcoded', 'aliases.json5')
  const aliases = readFileAsJson5(aliasesFile)
  return aliases as string[][]
}

export function readKnownDeputesWithoutWikipediaPage() {
  const aliasesFile = path.join(
    DATA_DIR,
    'hardcoded',
    'deputesWithoutWikipediaPage.json5',
  )
  const names = readFileAsJson5(aliasesFile)
  return names as string[]
}
