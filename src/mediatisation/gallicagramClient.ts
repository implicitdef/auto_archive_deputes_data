import { parse } from 'csv-parse/sync'
import sortBy from 'lodash/sortBy'
import sum from 'lodash/sum'
import fetch from 'node-fetch'
import { padStartWithZeroes } from '../utils'

export async function queryOccurencesLeMonde({
  deputeName,
  startYear,
  resolution,
}: {
  deputeName: string
  startYear: number
  resolution: 'year' | 'month' | 'day'
}) {
  new URLSearchParams()
  // https://regicid.github.io/api
  // https://shiny.ens-paris-saclay.fr/guni/query?mot=patate&corpus=presse&from=1789&to=1950
  const baseUrl = `https://shiny.ens-paris-saclay.fr/guni/query`
  const currentYear = new Date().getFullYear() + 1
  const mot = deputeName
    .replaceAll('-', ' ') // a vérifier s'il y a pas d'autres params qui font bugguer (ex: K/Bodo)
    .toLocaleLowerCase('fr-FR')
    // L'api ne supporte que jusqu'au 4-gram
    // Actuellement il n'y a que Emmanuel Taché de la Pagerie qui en a 5
    // En ne gardant que les 4 premiers mots, on devrait être quand même suffisamment spécifique
    // et ne tomber que sur cette personne
    .split(' ')
    .slice(0, 4)
    .join(' ')
  const urlParams = new URLSearchParams({
    mot,
    from: startYear.toString(),
    corpus: 'lemonde',
    to: currentYear.toString(),
    resolution:
      resolution === 'year'
        ? 'annee'
        : resolution === 'month'
        ? 'mois'
        : 'jour',
  })
  const url = `${baseUrl}?${urlParams.toString()}`
  console.log(`>> ${url}`)
  const res = await fetch(url)
  const textRes = await res.text()

  const parsedRes = csvToJson(textRes) as {
    n: string
    gram: string
    total: string
    annee: string
    // are present only for the corresponding resolutions
    mois?: string
    jour?: string
  }[]

  const simplifiedRes = sortBy(
    parsedRes.map(row => {
      const { n, total, annee, mois, jour } = row
      const dateElements =
        resolution === 'year'
          ? [annee]
          : resolution === 'month'
          ? [annee, mois!]
          : [annee, mois!, jour!]
      const date = dateElements.map(_ => padStartWithZeroes(_, 2)).join('-')
      return {
        n: parseInt(n, 0),
        total: parseInt(total, 0),
        date,
      }
    }),
    _ => _.date,
  )
  return simplifiedRes
}

function csvToJson(csvRawStr: string): { [k: string]: string }[] {
  const csvParsed = parse(csvRawStr) as string[][]
  const header = csvParsed[0]
  const rows = csvParsed.slice(1)
  return rows.map(row => {
    const obj: { [k: string]: string } = {}
    header.forEach((colName, idx) => {
      obj[colName] = row[idx]
    })
    return obj
  })
}
