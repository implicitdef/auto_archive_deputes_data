import path from 'path'
import { FoundWikipediaUrls, fetchWikipediaUrls } from './fetchWikipediaUrls'
import { DATA_DIR } from '../nosdeputesFetch'
import { writeToFile } from '../utils'
import { fetchWithRetry } from '../fetchWithRetry'
import * as cheerio from 'cheerio'
import slugify from 'slugify'
import pLimit from 'p-limit'

const WIKIPEDIA_DATA_DIR = path.join(DATA_DIR, 'wikipedia')
const wikipediaUrlsJsonFile = path.join(
  WIKIPEDIA_DATA_DIR,
  'wikipedia_urls.json',
)

export async function fetchWikipedia() {
  const foundWikipediaUrls = await fetchWikipediaUrls()
  console.log(`Writing to ${wikipediaUrlsJsonFile}`)
  writeToFile(
    wikipediaUrlsJsonFile,
    JSON.stringify(foundWikipediaUrls, null, 2),
  )
  // run only 5 at once
  const limit = pLimit(5)
  await Promise.all(
    foundWikipediaUrls
      .slice(0, 10)
      .map(foundUrl => limit(() => storeWikipediaHtml(foundUrl))),
  )
}

async function storeWikipediaHtml(
  foundWikipediaUrl: FoundWikipediaUrls[number],
) {
  const { id_an, name, url } = foundWikipediaUrl
  const html = await getWikipediaPageHtml(url)
  if (html) {
    const file = path.join(WIKIPEDIA_DATA_DIR, `${id_an}_${makeSlug(name)}.txt`)
    console.log(`Writing to ${file}`)
    writeToFile(file, html)
  } else {
    throw new Error(`Didn't find expected wikipedia html at ${url}`)
  }
}

async function getWikipediaPageHtml(urlPath: string) {
  console.log(`Reading wikipedia at ${urlPath}`)
  const url = `https://fr.wikipedia.org${urlPath}`
  const res = await fetchWithRetry(url)
  const html = await res.text()
  const $ = cheerio.load(html)
  return $(`#mw-content-text`).html()
}

function makeSlug(s: string) {
  return slugify(s, { lower: true, strict: true, replacement: '_' })
}
