import {
  extractFileName,
  listFilesInFolder,
  readFileAsYaml,
  sortAlphabetically,
} from '../utils'
import { WIKIPEDIA_PARAGRAPHS_DATA_DIR } from './fetchWikipediaParagraphs'
import _ from 'lodash'
import { WIKIPEDIA_SUMMARIES_DATA_DIR } from './fetchWikipediaSummaries'
import { WIKIPEDIA_DATA_DIR } from './fetchWikipediaUrls'
import path from 'path'
import { copyFileSync } from 'fs'

export const WIKIPEDIA_AFFAIRES_MANUAL_DATA_DIR = path.join(
  WIKIPEDIA_DATA_DIR,
  'affaires_manual',
)
export function tmpTool() {
  console.log('--- tmpTool')

  const manualFiles = sortAlphabetically(
    listFilesInFolder(WIKIPEDIA_AFFAIRES_MANUAL_DATA_DIR),
  )

  manualFiles.forEach(f => {
    try {
      const content = readFileAsYaml(f)
    } catch (e) {
      console.log('Failed to read ', f)
    }
  })
}
