import path from 'path'
import { readAllDeputesAndMap } from '../anopendata/readFromAnOpenData'
import { DATA_DIR } from '../nosdeputesFetch'
import { sum, writeToFile } from '../utils'
import { queryOccurencesLeMonde } from './gallicagramClient'
import pLimit from 'p-limit'

export const MEDIATISATION_DATA_DIR = path.join(DATA_DIR, 'mediatisation')
export const MEDIATISATION_JSON_FILE = path.join(
  MEDIATISATION_DATA_DIR,
  'mediatisation.json',
)

export async function fetchMediatisation() {
  const deputes = readAllDeputesAndMap(d => {
    const { nom, prenom } = d.etatCivil.ident
    return { name: `${prenom} ${nom}`, id_an: d.uid['#text'] }
  })

  // run only 10 at once, just in case. It's fast enough anyway
  const limit = pLimit(10)
  const res = Object.fromEntries(
    await Promise.all(
      deputes.map(depute =>
        limit(async () => {
          const deputeName = depute.name
          const occurences = await getRecentOccurencesLeMonde({ deputeName })
          return [depute.id_an, occurences] as const
        }),
      ),
    ),
  )

  console.log(`Writing to ${MEDIATISATION_JSON_FILE}`)
  writeToFile(MEDIATISATION_JSON_FILE, JSON.stringify(res, null, 2))
}

export async function getRecentOccurencesLeMonde({
  deputeName,
}: {
  deputeName: string
}) {
  // On regarde juste sur les 10 dernières années
  // Attention ce n'est donc pas pertinent pour les anciennes législatures
  const startYear = new Date().getFullYear() - 10
  const res = await queryOccurencesLeMonde({
    deputeName,
    startYear,
    resolution: 'year',
  })
  return sum(res.map(_ => _.n))
}
