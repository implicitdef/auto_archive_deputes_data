import slugify from 'slugify'
import {
  listFilesInFolder,
  readFileAsJson,
  readFileAsString,
  writeToFile,
} from '../utils'
import {
  WIKIPEDIA_CONTENTS_DATA_DIR,
  buildWikipediaContentFilePath,
} from './fetchWikipediaContents'
import {
  FoundWikipediaUrls,
  WIKIPEDIA_DATA_DIR,
  WIKIPEDIA_URLS_JSON_FILE,
} from './fetchWikipediaUrls'
import removeAccents from 'remove-accents'
import lo from 'lodash'
import path from 'path'
import yaml from 'js-yaml'

const WIKIPEDIA_AFFAIRES_DIR = path.join(WIKIPEDIA_DATA_DIR, 'affaires_search')

const keywords = [
  'polemique',
  'controverse',
  'affaire',
  'illegal',
  'scandale',
  'justice',
  'soupcons',
  'accusation',
  'enquete',
  'condamn',
  'mis en examen',
  'mise en examen',
  `prise illegale`,
  `de fonds publics`,
  'ineligibilite',
  'favoritisme',
  'clientelisme',
  'premiere instance',
  'cassation',
  'corruption',
  'proces',
  'delit',
  'crime',
  'penal',
  'abus',
]
const excluded_keywords = [
  'affaires rurales',
  'affaires sociales',
  'affaires locales',
  'affaires etrangeres',
  'affaires europeennes',
  'affaires internationale',
  'affaires culturelles',
  'reconversion dans les affaires',
  'justice, garde des sceaux',
]

export async function updateWikipediaAffaires() {
  console.log(`Reading ${WIKIPEDIA_URLS_JSON_FILE}`)
  const foundWikipediaUrls = readFileAsJson(
    WIKIPEDIA_URLS_JSON_FILE,
  ) as FoundWikipediaUrls

  const results = foundWikipediaUrls
    .map(({ id_an, name, url }) => {
      const file = buildWikipediaContentFilePath({ id_an, name })
      console.log(`Reading ${file}`)
      const rawContent = readFileAsString(file)
      const corpus = cleanup(rawContent)
      const matches = keywords
        .map(kw => {
          return findMatches(corpus, kw)
        })
        .flat()
        .filter(_ => {
          return !excluded_keywords.some(excludedKw => _.includes(excludedKw))
        })
      return { id_an, name, url, matches }
    })
    .filter(_ => _.matches.length > 0)
  console.log(`Got matches on ${results.length} wikipedia pages`)

  results.forEach(result => {
    const file = buildWikipediaAffairesFilePath(result)
    console.log(`Writing into ${file}`)
    writeToFile(file, yaml.dump(result))
  })
}

function cleanup(s: string) {
  return s
    .split('\n')
    .map(line => removeAccents(line))
    .map(line => line.toLocaleLowerCase('fr-FR'))
    .join(' --- ')
}

function findMatches(text: string, keyword: string) {
  let regex = new RegExp('(?:.{50})?' + keyword + '(?:.{50})?', 'g')
  return text.match(regex) || []
}

export function buildWikipediaAffairesFilePath({
  id_an,
  name,
}: {
  id_an: string
  name: string
}) {
  return path.join(WIKIPEDIA_AFFAIRES_DIR, `${id_an}_${makeSlug(name)}.yaml`)
}

function makeSlug(s: string) {
  return slugify(s, { lower: true, strict: true, replacement: '_' })
}
