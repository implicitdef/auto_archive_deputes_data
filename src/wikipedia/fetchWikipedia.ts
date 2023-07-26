import path from 'path'
import { fetchWikipediaUrls } from './fetchWikipediaUrls'
import { DATA_DIR } from '../nosdeputesFetch'
import { writeToFile } from '../utils'

const outFile = path.join(DATA_DIR, 'wikipedia', 'wikipedia_urls.json')

export async function fetchWikipedia() {
  const wikipediaUrls = await fetchWikipediaUrls()
  console.log(`Writing to ${outFile}`)
  writeToFile(outFile, JSON.stringify(wikipediaUrls, null, 2))
}
