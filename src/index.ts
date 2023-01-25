import * as fs from 'fs'
import { nosdeputesFetch } from './nosdeputesFetch'

console.log('@@ hello index.ts')

async function start() {
  console.log('@@ argv', process.argv)


  await nosdeputesFetch(readLegislatureArgument())
}

function readLegislatureArgument(): 'only_latest' | 'all' {
  const args = process.argv.slice(2)
  if (args.includes('--latestLegislatureOnly')) {
    return 'only_latest'
  }
  return 'all'
}

void start()
