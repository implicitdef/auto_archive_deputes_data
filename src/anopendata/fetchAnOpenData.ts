import { writeFileSync } from 'fs'
import path from 'path'
import { DATA_DIR } from '../nosdeputesFetch'
import {
  WORKDIR,
  downloadFile,
  listFilesOrDirsInFolder,
  move,
  readFileAsJson,
  rmDirIfExists,
  rmFileIfExists,
  unnestDirContents,
  unzipIntoDir,
} from '../utils'

const AMO30_URL =
  'https://data.assemblee-nationale.fr/static/openData/repository/16/amo/tous_acteurs_mandats_organes_xi_legislature/AMO30_tous_acteurs_tous_mandats_tous_organes_historique.json.zip'

export async function fetchAnOpenData() {
  const url = AMO30_URL
  const anOpenDataWorkDir = path.join(WORKDIR, 'anopendata')
  const zipPath = path.join(anOpenDataWorkDir, 'AMO30.zip')
  const unzippedDirPath = path.join(anOpenDataWorkDir, 'AMO30')
  const finalPath = path.join(DATA_DIR, 'anopendata', 'AMO30')
  rmDirIfExists(anOpenDataWorkDir)
  await downloadFile({ url, targetPath: zipPath })
  await unzipIntoDir({ zipFile: zipPath, unzippedDirPath })
  rmFileIfExists(zipPath)
  // there's a single folder named 'json', we can hoist the contents
  unnestDirContents(unzippedDirPath)

  listFilesOrDirsInFolder(unzippedDirPath).forEach(subDirs => {
    listFilesOrDirsInFolder(subDirs).forEach(file => {
      cleanupJsonFile(file)
    })
  })

  rmDirIfExists(finalPath)
  console.log(`Moving ${unzippedDirPath} to ${finalPath}`)
  move({ currentPath: unzippedDirPath, newPath: finalPath })
}

function cleanupJsonFile(filePath: string) {
  const json = readFileAsJson(filePath)
  // there is a useless root level, unnest it
  const keys = Object.keys(json)
  if (keys.length !== 1) {
    throw new Error(`${filePath} contains ${keys.length} key(s)`)
  }
  let subJson = json[keys[0]]
  subJson = removeUselessKeyFromJsonRecursively(subJson, '@xmlns:xsi')
  subJson = removeUselessKeyFromJsonRecursively(subJson, '@xmlns')
  // overwrite the file with the new version
  writeFileSync(filePath, JSON.stringify(subJson, null, 2))
}

function removeUselessKeyFromJsonRecursively(json: any, uselessKey: string) {
  function inner(o: any): any {
    if (Array.isArray(o)) {
      return o.map(item => inner(item))
    } else if (typeof o === 'object' && o !== null) {
      if (o.hasOwnProperty(uselessKey)) {
        delete o[uselessKey]
      }
      for (const key in o) {
        o[key] = inner(o[key])
      }
    }
    return o
  }
  return inner(json)
}
