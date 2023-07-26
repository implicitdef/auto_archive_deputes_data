import path from 'path'
import { FoundWikipediaUrls, fetchWikipediaUrls } from './fetchWikipediaUrls'
import { DATA_DIR } from '../nosdeputesFetch'
import { timeout, writeToFile } from '../utils'
import { fetchWithRetry } from '../fetchWithRetry'
import * as cheerio from 'cheerio'
import slugify from 'slugify'
import pLimit from 'p-limit'

const WIKIPEDIA_DATA_DIR = path.join(DATA_DIR, 'wikipedia')
const WIKIPEDIA_CONTENTS_DATA_DIR = path.join(WIKIPEDIA_DATA_DIR, 'contents')
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
  // run only 1 at once, with 1s delay
  // otherwise we get rate limited
  const limit = pLimit(1)
  await Promise.all(
    foundWikipediaUrls.slice(0, 20).map(foundUrl =>
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
    const file = path.join(
      WIKIPEDIA_CONTENTS_DATA_DIR,
      `${id_an}_${makeSlug(name)}.txt`,
    )
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
  const text = $(`#mw-content-text`).text()
  // remove successive line jumps
  return cleanup(text.replace(/\n{2,}/g, '\n'))
}

function cleanup(text: string) {
  return (
    text
      // trim each line
      .split('\n')
      .map(line => line.trim())
      // remove empty lines
      .filter(_ => _.length)
      .join('\n')
    //   .replace(/\n{2,}/g, '\n')
  )
}

function makeSlug(s: string) {
  return slugify(s, { lower: true, strict: true, replacement: '_' })
}
