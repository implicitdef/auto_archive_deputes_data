import { execSync } from 'child_process'
import fs from 'fs'
import yaml from 'js-yaml'
import JSON5 from 'json5'
import fetch from 'node-fetch'
import StreamZip from 'node-stream-zip'
import path from 'path'

export const WORKDIR = 'tmp'
export const LATEST_LEGISLATURE = 16

export function readFromEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined) {
    throw new Error(`Missing env variable ${name}`)
  }
  return value
}

export function readIntFromEnv(name: string): number {
  const res = parseIntOrNull(readFromEnv(name))
  if (res === null) {
    throw new Error(`env variable ${name} is not a integer`)
  }
  return res
}

function parseIntOrNull(str: string): number | null {
  const parsed = parseInt(str)
  if (isNaN(parsed)) return null
  return parsed
}

export function runCmd(cmd: string) {
  console.log(`>> ${cmd}`)
  execSync(cmd, {
    //env: process.env,
    encoding: 'utf-8',
    stdio: ['ignore', 'ignore', 'pipe'],
  })
}

export function rmDirIfExists(dir: string) {
  if (fs.existsSync(dir)) {
    console.log(`Cleaning directory ${dir} and all its contents`)
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

export function rmDirsIfExists(...dirs: string[]) {
  dirs.forEach(rmDirIfExists)
}

export function rmFileIfExists(file: string) {
  if (fs.existsSync(file)) {
    console.log(`Cleaning file ${file}`)
    fs.rmSync(file, { force: true })
  }
}

export function mkDirIfNeeded(dir: string) {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory ${dir}`)
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function writeToFile(filePath: string, content: string | Buffer) {
  const directory = path.parse(filePath).dir
  // create the parents directories if needed
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(filePath, content, 'utf8')
}

export function readFileAsJson(filePath: string): any {
  return JSON.parse(
    fs.readFileSync(filePath, {
      encoding: 'utf8',
    }),
  )
}

export function readFileAsString(filePath: string): string {
  return fs.readFileSync(filePath, {
    encoding: 'utf8',
  })
}

export function readFileAsJson5(filePath: string): any {
  return JSON5.parse(readFileAsString(filePath))
}

export function readFileAsYaml(filePath: string): any {
  return yaml.load(readFileAsString(filePath))
}

export function readFilesInSubdir(subDir: string): string[] {
  console.log(`Reading files in ${subDir}`)
  const filenames = fs.readdirSync(subDir)
  console.log(`${filenames.length} files found`)
  return filenames
}

export function isNotNull<A>(a: A | null): a is A {
  return a !== null
}

// https://stackoverflow.com/questions/22566379/how-to-get-all-pairs-of-array-javascript
export function getPossiblePairs<A>(arr: A[]): [A, A][] {
  return arr
    .map((a, index) => arr.slice(index + 1).map(w => [a, w]))
    .flat() as any
}

export function withChunkFactor(nbChunks: number): number {
  return Math.max(Math.round(nbChunks * 1), 1)
}

export function toInt(s: string) {
  return parseInt(s, 10)
}

export function timeout(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

export function listFilesInFolder(dirPath: string): string[] {
  if (fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory()) {
    return fs
      .readdirSync(dirPath)
      .filter(file => fs.lstatSync(path.join(dirPath, file)).isFile())
      .map(_ => path.join(dirPath, _))
  } else {
    throw new Error(
      `The path ${dirPath} either does not exist or it is not a directory.`,
    )
  }
}

export function listFilesOrDirsInFolder(dirPath: string): string[] {
  if (fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory()) {
    return fs.readdirSync(dirPath).map(_ => path.join(dirPath, _))
  } else {
    throw new Error(
      `The path ${dirPath} either does not exist or it is not a directory.`,
    )
  }
}

export type OnCopyingFileConflict =
  | 'overwrite'
  | 'ignore'
  | 'throw'
  | {
      kind: 'mergeMethod'
      method: (_: { jsonOfExistingFile: any; jsonOfFileToCopyIn: any }) => any
    }

export function copyFiles({
  srcDir,
  destDir,
  onConflict,
}: {
  srcDir: string
  destDir: string
  onConflict: OnCopyingFileConflict
}) {
  console.log(`Copying files from ${srcDir} to ${destDir}`)
  mkDirIfNeeded(destDir)
  const filesPaths = listFilesInFolder(srcDir)
  filesPaths.forEach(srcFilePath => {
    const filename = extractFileName(srcFilePath)
    const destinationFilePath = path.join(destDir, filename)
    if (fs.existsSync(destinationFilePath)) {
      if (onConflict === 'throw') {
        throw new Error(`File ${destinationFilePath} already exists.`)
      } else if (onConflict === 'overwrite') {
        copyFile(srcFilePath, destinationFilePath)
      } else if (typeof onConflict === 'object') {
        const { method } = onConflict
        const jsonOfFileToCopyIn = readFileAsJson(srcFilePath)
        const jsonOfExistingFile = readFileAsJson(destinationFilePath)
        const mergedJson = method({ jsonOfExistingFile, jsonOfFileToCopyIn })
        writeToFile(
          destinationFilePath,
          JSON.stringify(mergedJson, null, 2) + '\n',
        )
      }
    } else {
      copyFile(srcFilePath, destinationFilePath)
    }
  })
}

export function copyFile(srcFilePath: string, destinationFilePath: string) {
  fs.copyFileSync(srcFilePath, destinationFilePath)
}

export async function downloadFile({
  url,
  targetPath,
}: {
  url: string
  targetPath: string
}) {
  console.log('>>>', url)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}. Status: ${response.status}`)
  }
  const content = await response.buffer()
  rmFileIfExists(targetPath)
  writeToFile(targetPath, content)
}

export async function unzipIntoDir({
  zipFile,
  unzippedDirPath,
}: {
  zipFile: string
  unzippedDirPath: string
}) {
  // Extract all of the zip contents to a directory
  console.log(`Extracting to ${unzippedDirPath}`)
  rmDirIfExists(unzippedDirPath)
  fs.mkdirSync(unzippedDirPath)
  const streamZip = new StreamZip.async({ file: zipFile })
  const extractedEntries = await streamZip.extract(null, unzippedDirPath)
  console.log(`Extracted ${extractedEntries} entries into ${unzippedDirPath}`)
  await streamZip.close()
}

export function move({
  currentPath,
  newPath,
}: {
  currentPath: string
  newPath: string
}) {
  mkDirIfNeeded(path.dirname(newPath))
  fs.renameSync(currentPath, newPath)
}

// Give an folder A that contains only one folder B (and no files),
// this function hoist all the contents (files or folders of B) directly into A
// and then remove B.
export function unnestDirContents(folderA: string): void {
  const subFiles = listFilesOrDirsInFolder(folderA)
  if (subFiles.length !== 1) {
    console.log(
      `${folderA} contains ${subFiles.length} elements, no need to hoist its content`,
    )
    return
  }
  const folderBPath = subFiles[0]
  if (!fs.statSync(folderBPath).isDirectory()) {
    throw new Error(
      `${folderBPath} is not a directory, cannot hoist its content!`,
    )
  }
  const contentsOfB = listFilesOrDirsInFolder(folderBPath)
  for (const itemPath of contentsOfB) {
    const fileName = path.basename(itemPath)
    const newPath = path.join(folderA, fileName)
    move({ currentPath: itemPath, newPath })
  }
  rmDirIfExists(folderBPath)
}

export function getLast<A>(arr: A[]): A | undefined {
  return arr[arr.length - 1]
}

export function sum(arr: number[]) {
  if (arr.length === 0) {
    return 0
  }
  return arr.reduce((acc, curr) => acc + curr, 0)
}

export function extractFileName(filePath: string): string {
  return path.basename(filePath)
}

export function copyToFolder(filePath: string, dirName: string) {
  const fileName = extractFileName(filePath)
  const targetPath = path.join(dirName, extractFileName(filePath))
  console.log(`Copying to ${targetPath}`)
  fs.copyFileSync(filePath, targetPath)
}

export function sortAlphabetically(arr: string[]): string[] {
  return arr.slice().sort((a, b) => a.localeCompare(b))
}

export function padStartWithZeroes(str: string, targetLength: number): string {
  const diff = targetLength - str.length
  if (diff <= 0) return str
  return `${'0'.repeat(diff)}${str}`
}

type NotArray<T> = T extends any[] ? never : T

// given something that can be either A or A[]
// convert it to always be an array
export function forceArray<A extends NotArray<any>>(arrOrNot: A | A[]): A[] {
  return Array.isArray(arrOrNot) ? arrOrNot : [arrOrNot]
}
