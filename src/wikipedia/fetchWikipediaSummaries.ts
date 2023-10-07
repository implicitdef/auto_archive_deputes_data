import yaml from 'js-yaml'
import path from 'path'
import slugify from 'slugify'
import { readFileAsJson, readFileAsYaml, writeToFile } from '../utils'
import { searchParagraphForAffairesKeywords } from './affairesSearchUtils'
import { summarizeWithChatGptCached } from './chatGptSummarizer'
import { buildWikipediaParagraphsFilePath } from './fetchWikipediaParagraphs'
import {
  FoundWikipediaUrls,
  WIKIPEDIA_DATA_DIR,
  WIKIPEDIA_URLS_JSON_FILE,
} from './fetchWikipediaUrls'
import {
  SimplifiedTree,
  mapParagraphsAsync,
  pruneEmptyTitles,
  removeParagraphs,
} from './wikipediaSimplifiedTreeUtils'

export const WIKIPEDIA_SUMMARIES_DATA_DIR = path.join(
  WIKIPEDIA_DATA_DIR,
  'summaries',
)
export async function createWikipediaSummaries() {
  console.log('-- createWikipediaSummaries')
  console.log(`Reading ${WIKIPEDIA_URLS_JSON_FILE}`)
  const foundWikipediaUrls = readFileAsJson(
    WIKIPEDIA_URLS_JSON_FILE,
  ) as FoundWikipediaUrls

  for (const { id_an, name } of foundWikipediaUrls) {
    console.log('Summarizing', name)
    // read paragraphs file
    const file = buildWikipediaParagraphsFilePath({ id_an, name })
    const tree = readFileAsYaml(file) as SimplifiedTree
    // filter with affaires keyword
    const tree2 = pruneEmptyTitles(
      removeParagraphs(tree, p => {
        const matches = searchParagraphForAffairesKeywords(p)
        return matches.length === 0
      }),
    )
    // summarize with chatgpt
    const tree3 = await mapParagraphsAsync(tree2, async p => {
      return await summarizeWithChatGptCached(p)
    })
    const outFile = buildWikipediaSummariesFilePath({ id_an, name })
    console.log(`Writing to ${outFile}`)
    writeToFile(outFile, yaml.dump(tree3))
  }
}

function buildWikipediaSummariesFilePath({
  id_an,
  name,
}: {
  id_an: string
  name: string
}) {
  return path.join(
    WIKIPEDIA_SUMMARIES_DATA_DIR,
    `${id_an}_${makeSlug(name)}.yaml`,
  )
}

function makeSlug(s: string) {
  return slugify(s, { lower: true, strict: true, replacement: '_' })
}
