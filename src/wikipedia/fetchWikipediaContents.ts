import * as cheerio from 'cheerio'
import pLimit from 'p-limit'
import path from 'path'
import slugify from 'slugify'
import { fetchWithRetry } from '../fetchWithRetry'
import { DATA_DIR } from '../nosdeputesFetch'
import { readFileAsJson, timeout, writeToFile } from '../utils'
import {
  FoundWikipediaUrls,
  WIKIPEDIA_URLS_JSON_FILE,
} from './fetchWikipediaUrls'

const WIKIPEDIA_DATA_DIR = path.join(DATA_DIR, 'wikipedia')
export const WIKIPEDIA_CONTENTS_DATA_DIR = path.join(
  WIKIPEDIA_DATA_DIR,
  'contents',
)

export async function fetchWikipediaContents() {
  console.log(`Reading ${WIKIPEDIA_URLS_JSON_FILE}`)
  const foundWikipediaUrls = readFileAsJson(
    WIKIPEDIA_URLS_JSON_FILE,
  ) as FoundWikipediaUrls
  // run only 1 at once and with 1 second delay
  // otherwise we get rate limited
  const limit = pLimit(1)
  await Promise.all(
    foundWikipediaUrls.map(foundUrl =>
      limit(async () => {
        await storeWikipediaHtml(foundUrl)
        await timeout(1010)
      }),
    ),
  )
}

async function storeWikipediaHtml(
  foundWikipediaUrl: FoundWikipediaUrls[number],
) {
  const { id_an, name, url } = foundWikipediaUrl
  const content = await getWikipediaPageContent(url)
  if (content) {
    const file = buildWikipediaContentFilePath({ id_an, name })
    console.log(`Writing to ${file}`)
    writeToFile(file, content)
  } else {
    throw new Error(`Didn't find expected wikipedia html at ${url}`)
  }
}

async function getWikipediaPageContent(urlPath: string) {
  const url = `https://fr.wikipedia.org${urlPath}`
  console.log(`>> ${url}`)
  const res = await fetchWithRetry(url)
  const html = await res.text()
  const $ = cheerio.load(html)
  // remove the infobox, because it causes unnecessary diffs all the time
  $('#mw-content-text .infobox_v2').remove()
  const text = $(`#mw-content-text`).text()
  return cleanup(text)
}

function cleanup(text: string) {
  return (
    text
      // remove successive line jumps
      .replace(/\n{2,}/g, '\n')
      // trim each line
      .split('\n')
      .map(line => line.trim())
      // remove empty lines
      .filter(_ => _.length)
      // remove lines like this
      // En fonction depuis le 3 juillet 2020(3 ans et 23 jours)
      // because it causes unnecessary diffs all the time
      .filter(_ => !_.includes('En fonction depuis le'))
      .join('\n')
  )
}

export function buildWikipediaContentFilePath({
  id_an,
  name,
}: {
  id_an: string
  name: string
}) {
  return path.join(
    WIKIPEDIA_CONTENTS_DATA_DIR,
    `${id_an}_${makeSlug(name)}.txt`,
  )
}

function makeSlug(s: string) {
  return slugify(s, { lower: true, strict: true, replacement: '_' })
}
