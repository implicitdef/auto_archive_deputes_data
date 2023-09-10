import * as cheerio from 'cheerio'
import slugify from 'slugify'
import { fetchWithRetry } from '../fetchWithRetry'
import {
  readAliases,
  readHardcodedDeputesUrls,
  readKnownDeputesWithoutWikipediaPage,
} from '../readHardcodedData'
import { readAllDeputesAndMap } from '../anopendata/readFromAnOpenData'
import { isNotNull, writeToFile } from '../utils'
import path = require('path')
import { DATA_DIR } from '../nosdeputesFetch'

export type FoundWikipediaUrls = {
  id_an: string
  name: string
  url: string
}[]

export const WIKIPEDIA_DATA_DIR = path.join(DATA_DIR, 'wikipedia')
export const WIKIPEDIA_URLS_JSON_FILE = path.join(
  WIKIPEDIA_DATA_DIR,
  'wikipedia_urls.json',
)

export async function fetchWikipediaUrls(): Promise<void> {
  const allDeputesAfterMapping = await mainProcess()
  const failures = allDeputesAfterMapping.filter(
    _ => _.kind === 'not_found_unexpected',
  )
  if (failures.length) {
    const message = `Didn't find wikipedia URL for ${
      failures.length
    } deputes : ${failures
      .slice(0, 5)
      .map(_ => _.name)
      .join(', ')}`
    // There can often be a few deputes with missing pages for a small period of time
    // for example when there's a "remaniement"
    // there are some new deputes that are completely unknown
    // so we keep some tolerance here instead of failing the job
    if (failures.length > 10) {
      throw new Error(message)
    }
    console.warn(message)
  }
  const successes = allDeputesAfterMapping.filter(isFound)
  console.log(`Found ${successes.length} wikipedia URL`)
  const foundWikipediaUrls: FoundWikipediaUrls = successes.map(_ => ({
    id_an: _.id_an,
    name: _.name,
    url: _.wikipedia_link,
  }))
  console.log(`Writing to ${WIKIPEDIA_URLS_JSON_FILE}`)
  writeToFile(
    WIKIPEDIA_URLS_JSON_FILE,
    JSON.stringify(foundWikipediaUrls, null, 2),
  )
}

async function mainProcess() {
  const aliases = readAliases()
  function getAllAliases(name: string): string[] {
    return aliases.find(_ => _.includes(name)) ?? [name]
  }
  const deputes = readAllDeputesAndMap(d => {
    const { nom, prenom } = d.etatCivil.ident
    return { name: `${prenom} ${nom}`, id_an: d.uid['#text'] }
  })
  const linksFoundInWikipedia = await readLinksForAllLegislatures()
  console.log('Finished fetching Wikipedia')
  const namesWithoutWikipedia =
    readKnownDeputesWithoutWikipediaPage().flatMap(getAllAliases)
  const hardcodedDeputesUrls = readHardcodedDeputesUrls()
  const results: ResultForDepute[] = deputes.map(({ name, id_an }) => {
    const commonData = { id_an, name }
    const allPossibleSlugs = getAllAliases(name).map(makeSlug)
    const hardcodedUrl = hardcodedDeputesUrls[id_an] ?? undefined
    if (hardcodedUrl) {
      return {
        kind: 'found',
        ...commonData,
        wikipedia_link: hardcodedUrl,
      }
    }
    const link = linksFoundInWikipedia.find(_ =>
      allPossibleSlugs.includes(_.labelSlug),
    )
    if (link) {
      return {
        kind: 'found',
        ...commonData,
        wikipedia_link: link.url,
      }
    }
    if (namesWithoutWikipedia.includes(name)) {
      return {
        ...commonData,
        kind: 'not_found_as_expected',
      }
    }
    return {
      ...commonData,
      kind: 'not_found_unexpected',
    }
  })
  return results
}

type ResultForDepute = {
  id_an: string
  name: string
} & (
  | {
      kind: 'found'
      wikipedia_link: string
    }
  | {
      kind: 'not_found_as_expected'
    }
  | {
      kind: 'not_found_unexpected'
    }
)

async function readLinksForAllLegislatures() {
  const START_LEGISLATURE = 12
  const MAX_LEGISLATURE = 16
  const legislatures = Array.from(
    { length: MAX_LEGISLATURE - START_LEGISLATURE + 1 },
    (_, index) => START_LEGISLATURE + index,
  )
  const res = await Promise.all(
    legislatures.map(readLinksDeputesForLegislature),
  )
  return res.flat()
}

type LinkInWikipedia = { url: string; label: string; labelSlug: string }

async function readLinksDeputesForLegislature(legislature: number) {
  const pageName = `Liste_des_d%C3%A9put%C3%A9s_de_la_${getRomanFormat(
    legislature,
  )}e_l%C3%A9gislature_de_la_Cinqui%C3%A8me_R%C3%A9publique`
  const url = `https://fr.wikipedia.org/wiki/${pageName}`
  console.log(`Reading wikipedia at /${pageName}`)
  const res = await fetchWithRetry(url)
  const html = await res.text()

  const $ = cheerio.load(html)
  // On prend TOUS les liens de la page
  const allLinks = (
    $('a')
      .map((i, a) => {
        const url = $(a).attr('href')
        const label = $(a).text()
        if (url && label) {
          return { url, label, labelSlug: makeSlug(label) } as LinkInWikipedia
        }
        return null
      })
      .filter(isNotNull)
      .get() as LinkInWikipedia[]
  ).filter(_ => {
    // these are links to page that don't actually exist
    return !_.url.includes('action=edit')
  })

  return allLinks
}

function getRomanFormat(legislature: number) {
  switch (legislature) {
    case 12:
      return 'XII'
    case 13:
      return 'XIII'
    case 14:
      return 'XIV'
    case 15:
      return 'XV'
    case 16:
      return 'XVI'
    case 17:
      return 'XVII'
    case 18:
      return 'XVIII'
    default:
      throw new Error(`Can't handle legislature ${legislature}`)
  }
}

function makeSlug(s: string) {
  return slugify(s, { lower: true, strict: true })
}

function isFound(r: ResultForDepute): r is ResultForDepute & { kind: 'found' } {
  return r.kind === 'found'
}
