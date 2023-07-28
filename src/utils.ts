import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import JSON5 from 'json5'

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

export function mkDirIfNeeded(dir: string) {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory ${dir}`)
    fs.mkdirSync(dir)
  }
}

export function writeToFile(filePath: string, content: string) {
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
  return JSON5.parse(
    fs.readFileSync(filePath, {
      encoding: 'utf8',
    }),
  )
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
