import { nosdeputesFetch } from './nosdeputesFetch'

async function start() {
  console.log('Running script with arguments', process.argv.slice(2))
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
