import * as cheerio from 'cheerio'
import yaml from 'js-yaml'
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
import {
  Tag,
  Tree,
  buildTreeFromTags,
  dropTitleNodes,
} from './wikipediaTreeUtils'
import { SimplifiedTree, simplifyTree } from './wikipediaSimplifiedTreeUtils'

export const WIKIPEDIA_DATA_DIR = path.join(DATA_DIR, 'wikipedia')
export const WIKIPEDIA_PARAGRAPHS_DATA_DIR = path.join(
  WIKIPEDIA_DATA_DIR,
  'paragraphs',
)

// TODO try to do a recap of each paragraph with chatgpt, and store that too
// Note : try to do chatgpt only for paragraphs that changed (so maybe we have to store hashes of the original text in the chatgpt result, so we can tell if it's outdated or not) But how to handle diffs since it's a tree structure and stuff may move around ?
// this is the complicated part, so let's start by just paying chatgpt, and evaluate the cost

export async function fetchWikipediaParagraphs() {
  console.log('-- fetchWikipediaParagraphs')
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
        await storeWikipediaParagraphs(foundUrl)
        await timeout(1010)
      }),
    ),
  )
}

async function storeWikipediaParagraphs(
  foundWikipediaUrl: FoundWikipediaUrls[number],
) {
  const { id_an, name, url } = foundWikipediaUrl
  const tree = await getWikipediaParagraphsTree(url)
  if (tree) {
    const file = buildWikipediaParagraphsFilePath({ id_an, name })
    console.log(`Writing to ${file}`)
    writeToFile(file, yaml.dump(tree))
  } else {
    throw new Error(`Didn't find expected wikipedia html at ${url}`)
  }
}

const selectorsToRemove = [
  // the infobox from the top right
  '.infobox_v2',
  // boutons modifier/modifier le code
  '.mw-editsection',
  // the references, they add unnecessary texts
  '.reference',
  // the images floating within the article
  'figure',
  // links like "Article connexe" sometimes appearing on top of paragraphs
  '.metadata',
  // table and diagrammes
  'table, .diagramme',
  'style',
]

// there's nothing interesting in these
const titlesToRemove = [
  'Résultats électoraux',
  'Détail des mandats et fonctions',
  'Publication',
  'Publications',
  'Notes et références',
  'Notes',
  'Références',
  'Voir aussi',
  'Bibliographie',
  'Filmographie',
  'Discographie',
  'Ouvrages',
  'Ouvrages et expositions',
  'Expositions photographiques',
  'Ouvrages photographiques',
  'Dans la fiction',
  'Documentaires',
  'Articles connexes',
  'Liens externes',
]

async function getWikipediaParagraphsTree(
  urlPath: string,
): Promise<SimplifiedTree> {
  const url = `https://fr.wikipedia.org${urlPath}`
  console.log(`>> ${url}`)
  const res = await fetchWithRetry(url)
  const html = await res.text()
  const $ = cheerio.load(html)
  const rootDiv = $('.mw-parser-output')

  selectorsToRemove.forEach(selector => {
    rootDiv.find(selector).remove()
  })
  const tags = (
    rootDiv
      .children()
      .map((idx, element) => {
        const el = $(element)
        return {
          tagName: el.prop('tagName').toLowerCase(),
          text: el
            .text()
            .trim()
            // replace non breaking spaces
            .replace(/\u00a0/g, ' ')
            // this should always be good
            .normalize('NFC'),
        }
      })
      .get() as Tag[]
  ).filter(_ => _.text.length > 0)

  const tree = buildTreeFromTags(tags)
  const tree2 = dropTitleNodes(tree, titlesToRemove)
  const tree3 = simplifyTree(tree2)
  return tree3
}

export function buildWikipediaParagraphsFilePath({
  id_an,
  name,
}: {
  id_an: string
  name: string
}) {
  return path.join(
    WIKIPEDIA_PARAGRAPHS_DATA_DIR,
    `${id_an}_${makeSlug(name)}.yaml`,
  )
}

function makeSlug(s: string) {
  return slugify(s, { lower: true, strict: true, replacement: '_' })
}
