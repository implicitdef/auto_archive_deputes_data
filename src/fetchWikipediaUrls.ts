import * as cheerio from 'cheerio'
import slugify from 'slugify'
import { fetchWithRetry } from './fetchWithRetry'
import { DATA_DIR } from './nosdeputesFetch'
import {
  readAliases,
  readKnownDeputesWithoutWikipediaPage,
} from './readHardcodedData'
import { readAllDeputesAndMap } from './tricoteuses/readFromTricoteuses'
import { writeToFile } from './utils'
import path = require('path')

const outFile = path.join(DATA_DIR, 'wikipedia', 'wikipedia_pages.json')

export async function fetchWikipediaUrls() {
  const allDeputesAfterMapping = await mainProcess()
  const failures = allDeputesAfterMapping.filter(
    _ => _.kind === 'not_found_unexpected',
  )
  if (failures.length) {
    throw new Error(
      `Didn't find wikipedia URL for ${failures.length} deputes : ${failures
        .slice(0, 5)
        .map(_ => _.name)
        .join(', ')}`,
    )
  }
  const successes = allDeputesAfterMapping.filter(isFound)
  console.log(`Found ${successes.length} wikipedia URL`)
  const output = successes.map(_ => ({
    id_an: _.id_an,
    name: _.name,
    url: _.link.url,
  }))
  console.log(`Writing to ${outFile}`)
  writeToFile(outFile, JSON.stringify(output, null, 2))
}

async function mainProcess() {
  const aliases = readAliases()
  function getAllAliases(name: string): string[] {
    return aliases.find(_ => _.includes(name)) ?? [name]
  }
  const deputes = readAllDeputesAndMap(d => {
    const { nom, prenom } = d.etatCivil.ident
    return { name: `${prenom} ${nom}`, id_an: d.uid }
  })
  const linksFoundInWikipedia = await readLinksForAllLegislatures()
  const namesWithoutWikipedia =
    readKnownDeputesWithoutWikipediaPage().flatMap(getAllAliases)
  console.log('Finished fetching Wikipedia')
  const results: ResultForDepute[] = deputes.map(({ name, id_an }) => {
    const allPossibleSlugs = getAllAliases(name).map(makeSlug)
    const link = linksFoundInWikipedia.find(_ =>
      allPossibleSlugs.includes(_.labelSlug),
    )
    const commonData = { id_an, name }
    if (link) {
      return {
        kind: 'found',
        ...commonData,
        link,
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
      link: LinkInWikipedia
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
  const allLinks = $('a')
    .map((i, a) => {
      const url = $(a).attr('href')
      const label = $(a).text()
      return { url, label, labelSlug: makeSlug(label) } as LinkInWikipedia
    })
    .get() as LinkInWikipedia[]
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
