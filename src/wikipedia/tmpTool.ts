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

export const WIKIPEDIA_AFFAIRES_MANUAL_DATA_DIR = path.join(
  WIKIPEDIA_DATA_DIR,
  'affaires_manual',
)

const LEGISLATURES_TO_PRIORIZE = [16]
export function tmpTool() {
  console.log('--- tmpTool')

  const ndData = readNosDeputesBasicData()

  const manualFiles = sortAlphabetically(
    listFilesInFolder(WIKIPEDIA_AFFAIRES_MANUAL_DATA_DIR),
  )

  let cptInvalid = 0
  let cptDone = 0
  let cptEmpty = 0
  let nextFileToWorkOn: string | null = null
  manualFiles.forEach(f => {
    const filename = extractFileName(f)
    const idAn = filename.split('_')[0]
    const legislatures = ndData
      .filter(_ => _.id_an === idAn)
      .map(_ => _.legislature)
    const isPriorizedDepute = legislatures.some(_ =>
      LEGISLATURES_TO_PRIORIZE.includes(_),
    )
    if (isPriorizedDepute) {
      const content = readFileAsYaml(f)
      const res = affairesArraySchema.safeParse(content)
      if (res.success) {
        if (res.data.length > 0) {
          cptDone++
        } else {
          cptEmpty++
        }
      } else {
        if (!nextFileToWorkOn) {
          nextFileToWorkOn = f
        }
        cptInvalid++
      }
    }
  })
  console.log('Etat des lieux pour les législature', LEGISLATURES_TO_PRIORIZE, {
    cptDone,
    cptInvalid,
    cptEmpty,
  })
  console.log('Prochain fichier sur lequel travailler :', nextFileToWorkOn)
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
