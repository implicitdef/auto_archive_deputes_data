import path from 'path'
import {
  extractFileName,
  listFilesInFolder,
  readFileAsJson,
  readFileAsYaml,
  sortAlphabetically,
} from '../utils'
import { WIKIPEDIA_DATA_DIR } from './fetchWikipediaUrls'
import { z } from 'zod'
import {
  DeputeFinalWithLegislature,
  NOSDEPUTES_BASIC_DATA_FILE,
} from '../nosdeputesFetch'
import { MEDIATISATION_JSON_FILE } from '../mediatisation/fetchMediatisation'
import { sortBy } from 'lodash'

export const WIKIPEDIA_AFFAIRES_MANUAL_DATA_DIR = path.join(
  WIKIPEDIA_DATA_DIR,
  'affaires_manual',
)

const LATEST_LEGISLATURE = 16

export function tmpTool() {
  console.log('--- tmpTool')

  const ndData = readNosDeputesBasicData()
  const mediatisationData = readMediatisationData()

  const manualFiles = listFilesInFolder(WIKIPEDIA_AFFAIRES_MANUAL_DATA_DIR)
  const manualFilesWithContext = manualFiles.map(f => {
    const filename = extractFileName(f)
    const idAn = filename.split('_')[0]
    const legislatures = ndData
      .filter(_ => _.id_an === idAn)
      .map(_ => _.legislature)
    const isInCurrentLegislature = legislatures.includes(LATEST_LEGISLATURE)
    const mediatisationScore = mediatisationData[idAn] ?? 0

    const content = readFileAsYaml(f)
    const parsingRes = affairesArraySchema.safeParse(content)
    const status = parsingRes.success
      ? parsingRes.data.length > 0
        ? 'done'
        : 'empty'
      : 'invalid'

    return {
      f,
      filename,
      isInCurrentLegislature,
      mediatisationScore,
      status,
    } as const
  })

  const res = sortBy(
    manualFilesWithContext.filter(_ => _.isInCurrentLegislature),
    _ => -_.mediatisationScore,
  )

  const cptDone = res.filter(_ => _.status === 'done').length
  const cptInvalid = res.filter(_ => _.status === 'invalid').length
  const cptEmpty = res.filter(_ => _.status === 'empty').length
  const nextFileToWorkOn = res.find(_ => _.status === 'invalid')?.filename
  const nextThree = res
    .filter(_ => _.status === 'invalid')
    .slice(1, 4)
    .map(_ => _.filename)

  console.log('Etat des lieux pour la législature', LATEST_LEGISLATURE, {
    cptDone,
    cptInvalid,
    cptEmpty,
  })
  console.log('Prochain fichier sur lequel travailler :', nextFileToWorkOn)
  console.log('Et les 3 suivants seront :')
  nextThree.forEach(_ => console.log(_))
}

const affairesArraySchema = z.array(
  z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    text: z.array(z.union([z.string(), z.array(z.string())])), // (string | string[])[]
    sources: z.array(z.string()),
  }),
)

export type AffairesArray = z.infer<typeof affairesArraySchema>
export type Affaire = AffairesArray[number]

function readNosDeputesBasicData() {
  return readFileAsJson(
    NOSDEPUTES_BASIC_DATA_FILE,
  ) as DeputeFinalWithLegislature[]
}

function readMediatisationData() {
  return readFileAsJson(MEDIATISATION_JSON_FILE) as { [id_an: string]: number }
}
