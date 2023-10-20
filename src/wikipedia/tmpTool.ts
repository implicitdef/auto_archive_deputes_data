import path from 'path'
import { listFilesInFolder, readFileAsYaml, sortAlphabetically } from '../utils'
import { WIKIPEDIA_DATA_DIR } from './fetchWikipediaUrls'
import { z } from 'zod'

export const WIKIPEDIA_AFFAIRES_MANUAL_DATA_DIR = path.join(
  WIKIPEDIA_DATA_DIR,
  'affaires_manual',
)
export function tmpTool() {
  console.log('--- tmpTool')

  const manualFiles = sortAlphabetically(
    listFilesInFolder(WIKIPEDIA_AFFAIRES_MANUAL_DATA_DIR),
  )

  let cptInvalid = 0
  let cptDone = 0
  let cptEmpty = 0
  manualFiles.forEach(f => {
    const content = readFileAsYaml(f)
    const res = affairesArraySchema.safeParse(content)
    if (res.success) {
      if (res.data.length > 0) {
        cptDone++
      } else {
        cptEmpty++
      }
    } else {
      cptInvalid++
    }
  })
  console.log({ cptDone, cptInvalid, cptEmpty })
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
