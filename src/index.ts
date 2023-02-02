import { fetchElectionsPartiellesFromMinistere } from './electionsPartiellesFromMinistereInterieur'
import { fetchElectionsPartiellesFromWikipedia } from './electionsPartiellesFromWikipedia'
import {
  LegislatureArg,
  nosdeputesFetchBasicData,
  nosdeputesFetchWeeklyStats,
} from './nosdeputesFetch'

type Command =
  | 'update_nosdeputes_basic_data'
  | 'update_nosdeputes_weekly_stats'
  | 'update_elections_partielles'

async function start() {
  // await fetchElectionsPartiellesFromMinistere()
  // await fetchElectionsPartiellesFromWikipedia()

  console.log('Running script with arguments', process.argv.slice(2))
  switch (readCommandArgument()) {
    case 'update_nosdeputes_basic_data':
      await nosdeputesFetchBasicData(readLegislatureArgument())
      break
    case 'update_nosdeputes_weekly_stats':
      await nosdeputesFetchWeeklyStats(readLegislatureArgument())
      break
    // case 'update_elections_partielles':
    //   await fetchElectionsPartielles()
    //   break
  }
}

function readLegislatureArgument(): LegislatureArg {
  const args = process.argv.slice(2)
  if (args.includes('--latestLegislatureOnly')) {
    return 'only_latest'
  }
  return 'all'
}

function readCommandArgument(): Command {
  const args = process.argv.slice(2)
  if (args.includes('update_nosdeputes_basic_data')) {
    return 'update_nosdeputes_basic_data'
  }
  if (args.includes('update_nosdeputes_weekly_stats')) {
    return 'update_nosdeputes_weekly_stats'
  }
  if (args.includes('update_elections_partielles')) {
    return 'update_elections_partielles'
  }
  throw new Error('Missing or unknown command')
}

void start()
