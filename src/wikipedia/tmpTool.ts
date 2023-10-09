import { listFilesInFolder } from '../utils'
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

  const sourceFiles = sortAlphabetically(
    listFilesInFolder(WIKIPEDIA_SUMMARIES_DATA_DIR),
  )
  const manualFilesNames = sortAlphabetically(
    listFilesInFolder(WIKIPEDIA_AFFAIRES_MANUAL_DATA_DIR),
  ).map(extractFileName)

  console.log(
    `Found ${sourceFiles.length} source files, and ${manualFilesNames.length} manual files so far`,
  )

  function isCopiedAlready(sourceFilePath: string) {
    const fileName = extractFileName(sourceFilePath)
    return manualFilesNames.includes(fileName)
  }

  const filesToCopy = sourceFiles.filter(_ => !isCopiedAlready(_)).slice(0, 10)

  filesToCopy.forEach(f => {
    copyToFolder(f, WIKIPEDIA_AFFAIRES_MANUAL_DATA_DIR)
  })
}

function sortAlphabetically(arr: string[]): string[] {
  return arr.slice().sort((a, b) => a.localeCompare(b))
}

function extractFileName(filePath: string): string {
  return path.basename(filePath)
}

function copyToFolder(filePath: string, dirName: string) {
  const fileName = extractFileName(filePath)
  const targetPath = path.join(dirName, extractFileName(filePath))
  console.log(`Copying to ${targetPath}`)
  copyFileSync(filePath, targetPath)
}
