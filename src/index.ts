import {
  LegislatureArg,
  nosdeputesFetchBasicData,
  nosdeputesFetchWeeklyStats,
} from './nosdeputesFetch'

type Command = 'update_nosdeputes_basic_data' | 'update_nosdeputes_weekly_stats'

async function start() {
  console.log('Running script with arguments', process.argv.slice(2))
  switch (readCommandArgument()) {
    case 'update_nosdeputes_basic_data':
      await nosdeputesFetchBasicData(readLegislatureArgument())
      break
    case 'update_nosdeputes_weekly_stats':
      await nosdeputesFetchWeeklyStats(readLegislatureArgument())
      break
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
  throw new Error('Missing or unknown command')
}

void start()
