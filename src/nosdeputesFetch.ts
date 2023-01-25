import * as lo from 'lodash'
import path from 'path'
import { fetchWithRetry } from './fetchWithRetry'
import { readFileAsJson, writeToFile } from './utils'
const datadir = path.join('data')

const nosDeputesLegislatures = [
  [16, 'www.nosdeputes.fr'],
  [15, '2017-2022.nosdeputes.fr'],
  [14, '2012-2017.nosdeputes.fr'],
  [13, '2007-2012.nosdeputes.fr'],
] as const

export type LegislatureArg = 'only_latest' | 'all'

const latestLegislature = lo.max(nosDeputesLegislatures.map(_ => _[0]))

type DeputesJsonFileFromNosDeputes = {
  deputes: {
    depute: {
      // there are a bunch of other fields, but it doesn't matter here
      id: number
      slug: string
      id_an: string
      nom: string
    }
  }[]
}
type DeputeFinalWithLegislature = {
  // the same depute can be present in NosDeputes with different values in each legislature
  // we need to distinguish them
  legislature: number
  id_nd: number
  slug: string
  id_an: string
  nom: string
}

export async function nosdeputesFetchBasicData(legislatureArg: LegislatureArg) {
  const filePath = path.join(
    datadir,
    'nosdeputes',
    'nosdeputes_basic_data.json',
  )
  const newData: DeputeFinalWithLegislature[] = (
    await Promise.all(
      nosDeputesLegislatures
        .filter(([legislature]) => {
          if (legislatureArg === 'all') {
            return true
          }
          return legislature === latestLegislature
        })
        .map(async ([legislature, domain]) => {
          const deputes = await fetchDeputes(domain)
          const deputesWithLegislature = deputes.map(depute => {
            const { id, slug, id_an, nom } = depute
            return {
              id_nd: id,
              slug,
              id_an: `PA${id_an}`,
              nom,
              legislature,
            }
          })
          return deputesWithLegislature
        }),
    )
  ).flat()
  const existingData = readFileAsJson(filePath) as DeputeFinalWithLegislature[]

  const existingDataWithoutDataToOverride = existingData.filter(dOld => {
    // If we have new data for this depute, we prefer to discard the old and keep the new
    return !newData.some(
      dNew =>
        dNew.id_an === dOld.id_an && dNew.legislature === dOld.legislature,
    )
  })
  const mergedData = lo.sortBy(
    [...existingDataWithoutDataToOverride, ...newData],
    _ => `${_.legislature}_${_.id_an}`,
  )
  console.log(`Writing to file ${filePath}`)
  writeToFile(filePath, JSON.stringify(mergedData, null, 2))
}

export async function nosdeputesFetchWeeklyStats(
  legislatureArg: LegislatureArg,
) {
  const statsDir = path.join(datadir, 'nosdeputes', 'weeklystats')
  // before legislature 15, the endpoint is different, weekly stats don't seem available
  const FIRST_LEGISLATURE_WITH_ACCESSIBLE_STATS = 15
  for (const [legislature, domain] of nosDeputesLegislatures) {
    if (legislatureArg === 'all' || legislature === latestLegislature) {
      if (legislature >= FIRST_LEGISLATURE_WITH_ACCESSIBLE_STATS) {
        const deputes = await fetchDeputes(domain)
        for (const depute of deputes) {
          const { slug, id_an: id_an_without_prefix, nom } = depute
          const id_an = `PA${id_an_without_prefix}`
          const stats = await fetchStatsOfDepute(domain, slug)
          const finalContent = {
            // add legislature and id_an in the content, it will be easier to process
            id_an,
            legislature,
            // can't hurt to add the nom, just to be more readable
            nom,
            ...stats,
          }
          const filePath = path.join(statsDir, `${legislature}_${id_an}.json`)
          console.log(`Writing to file ${filePath}`)
          writeToFile(filePath, JSON.stringify(finalContent, null, 2) + '\n')
        }
      }
    }
  }
}

async function fetchDeputes(domain: string) {
  const url = `https://${domain}/deputes/json`
  console.log(`>> ${url}`)
  const res = await fetchWithRetry(url)
  if (!res.ok) {
    throw new Error(`Bad response from ${url} : ${res.status}`)
  }
  console.log(`<< OK`)
  const json = (await res.json()) as DeputesJsonFileFromNosDeputes
  // remove unnecessary nesting
  return json.deputes.map(({ depute }) => depute)
}

async function fetchStatsOfDepute(domain: string, slug: string) {
  const url = `https://${domain}/${slug}/graphes/legislature/total?questions=true&format=json`
  console.log(`>> ${url}`)
  const res = await fetchWithRetry(url)
  if (!res.ok) {
    throw new Error(`Bad response from ${url} : ${res.status}`)
  }
  console.log(`<< OK`)
  const json = await res.json()
  return json
}
