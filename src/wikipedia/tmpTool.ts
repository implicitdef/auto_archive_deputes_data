import path from 'path'
import { listFilesInFolder, readFileAsYaml, sortAlphabetically } from '../utils'
import { WIKIPEDIA_DATA_DIR } from './fetchWikipediaUrls'

export const WIKIPEDIA_AFFAIRES_MANUAL_DATA_DIR = path.join(
  WIKIPEDIA_DATA_DIR,
  'affaires_manual',
)
export function tmpTool() {
  console.log('--- tmpTool')

  const manualFiles = sortAlphabetically(
    listFilesInFolder(WIKIPEDIA_AFFAIRES_MANUAL_DATA_DIR),
  )

  const cpts = [0, 0, 0]
  manualFiles.forEach(f => {
    const content = readFileAsYaml(f)
    if (Array.isArray(content) && content.length === 0) {
      cpts[0]++
    } else if (
      Array.isArray(content) &&
      content.length === 1 &&
      typeof content[0] === 'string'
    ) {
      cpts[1]++
    } else {
      cpts[2]++
    }
  })
  console.log(cpts)
}
