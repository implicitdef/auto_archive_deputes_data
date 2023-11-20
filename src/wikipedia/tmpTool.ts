import { sortBy } from 'lodash'
import path from 'path'
import { z } from 'zod'
import { MEDIATISATION_JSON_FILE } from '../mediatisation/fetchMediatisation'
import {
  DeputeFinalWithLegislature,
  NOSDEPUTES_BASIC_DATA_FILE,
} from '../nosdeputesFetch'
import {
  extractFileName,
  listFilesInFolder,
  readFileAsJson,
  readFileAsYaml,
} from '../utils'
import { WIKIPEDIA_DATA_DIR } from './fetchWikipediaUrls'

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
        ? parsingRes.data.every(_ => _.to_rework !== true)
          ? 'done'
          : 'to_rework'
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
  const cptToRework = res.filter(_ => _.status === 'to_rework').length
  const cptInvalid = res.filter(_ => _.status === 'invalid').length
  const cptEmpty = res.filter(_ => _.status === 'empty').length
  const nextFileToWorkOn = res.find(_ => _.status === 'invalid')?.filename
  const nextThree = res
    .filter(_ => _.status === 'invalid')
    .slice(1, 4)
    .map(_ => _.filename)

  console.log('Etat des lieux pour la législature', LATEST_LEGISLATURE, {
    cptDone,
    cptToRework,
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
    text: z.union([
      // (string | string[])[]
      z.array(z.union([z.string(), z.array(z.string())])),
      // {factual_events : string[], legal_process: string[]}
      z.object({
        factual_events: z.array(z.string()),
        legal_process: z.array(z.string()),
      }),
    ]),
    sources: z.array(z.string()).nullable(),
    to_rework: z.boolean().optional(),
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
