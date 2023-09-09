import {
  ActeurJson,
  readAllDeputesAndMap,
} from './anopendata/readFromAnOpenData'
import * as lo from 'lodash'
import fs from 'fs'
import fetch from 'node-fetch'
import path from 'path'
import { LegislatureArg } from './nosdeputesFetch'
import { LATEST_LEGISLATURE } from './utils'
export const DATA_DIR = path.join('data')

type MinimalDepute = {
  uid: string
  latestLegislature: number
}

export async function fetchPhotos(legislatureArg: LegislatureArg) {
  const deputes = readAllDeputesAndMap(getUidAndLastLegislature).filter(_ => {
    if (legislatureArg === 'only_latest') {
      return _.latestLegislature === LATEST_LEGISLATURE
    }
    return true
  })
  console.log(`Downloading images for ${deputes.length} deputes`)
  for (const depute of deputes) {
    const fileName = path.join(DATA_DIR, 'an_photos', `${depute.uid}.jpg`)
    const url = `https://www2.assemblee-nationale.fr/static/tribun/${
      depute.latestLegislature
    }/photos/${depute.uid.substring(2)}.jpg`
    await downloadImage(url, fileName)
  }
  console.log('Done')
}

function getUidAndLastLegislature(
  deputeJson: ActeurJson,
  legislatures: number[],
): MinimalDepute {
  return {
    uid: deputeJson.uid,
    latestLegislature:
      lo.max(legislatures) ??
      // should not happen
      0,
  }
}

async function downloadImage(url: string, filename: string): Promise<void> {
  console.log(`>> ${url}`)
  const response = await fetch(url)
  const writer = fs.createWriteStream(filename)
  response.body.pipe(writer)
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}
