// Source
// https://www.interieur.gouv.fr/Elections/Les-resultats/Partielles/Legislatives
// n'a des pages que pour 2021 et avant

// mais pour 2022 ? pas d'élections partielles ? à verifier
// et pour 2023 ?
// wikipedia en a https://fr.wikipedia.org/wiki/%C3%89lection_l%C3%A9gislative_fran%C3%A7aise_partielle

import cheerio from 'cheerio'
import fetch from 'node-fetch'
import lo from 'lodash'
import { departements } from '../departementsRef'
import path from 'path'
import { DATA_DIR } from './nosdeputesFetch'
import { writeToFile } from './utils'

async function fetchAllTitles() {
  const currentYear = new Date().getFullYear()
  const years = lo.range(2002, currentYear + 1)
  const titles: string[] = []
  for (const year of years) {
    titles.push(...(await getElectionsTitlesForYear(year)))
  }
  return titles
}

export async function fetchElectionsPartiellesFromMinistere() {
  const titles = await fetchAllTitles()
  const finalRes = lo.sortBy(
    titles.map(title => {
      const circoNumber = extractCircoNumber(title)
      const dpt = extractDepartementName(title)
      const tours = extractDates(title)
      return {
        // title,
        tours,
        dpt,
        circoNumber,
      }
    }),
    _ => `${_.tours[0]} ${_.tours[1]} ${_.dpt} ${_.circoNumber}`,
  )
  const filePath = path.join(
    DATA_DIR,
    'electionspartielles',
    'electionspartielles_mi.json',
  )

  console.log(`Writing to file ${filePath}`)
  writeToFile(filePath, JSON.stringify(finalRes, null, 2) + '\n')
}

function parseMonth(monthStr: string) {
  function inner() {
    switch (monthStr.toLowerCase()) {
      case 'janvier':
        return 1
      case 'fevrier':
      case 'février':
        return 2
      case 'mars':
        return 3
      case 'avril':
        return 4
      case 'mai':
        return 5
      case 'juin':
        return 6
      case 'juillet':
        return 7
      case 'aout':
      case 'août':
        return 8
      case 'septembre':
        return 9
      case 'octobre':
        return 10
      case 'novembre':
        return 11
      case 'decembre':
      case 'décembre':
        return 12
      default:
        throw new Error(`Unrecognized month ${monthStr}`)
    }
  }
  // pad with leading 0
  return padDayOrMonth(inner())
}

// add the leading zero
function padDayOrMonth(s: string | number) {
  return `0${s.toString()}`.slice(-2)
}

function extractDates(title: string): [string] | [string, string] {
  const standardized = title
    .replace('1er et 2ème tour', '')
    .replace('1er tour', '')
    .replaceAll('-', ' ')
    .replaceAll(' 1er ', ' 1 ')
    .replaceAll(' et du ', ' et ')

  function extractDatesSameMonth(): [string, string] | null {
    // ex: "... 12 et 19 juin 2000 ..."
    const regexp = / (\d+) et (\d+) ([éûa-z]+) (\d{4})/
    const res = regexp.exec(standardized)
    if (!res) return null
    const groups = res.slice(1)
    const [day1, day2, monthStr, year] = groups

    return [
      `${year}-${parseMonth(monthStr)}-${padDayOrMonth(day1)}`,
      `${year}-${parseMonth(monthStr)}-${padDayOrMonth(day2)}`,
    ]
  }

  function extractDatesDifferentMonths(): [string, string] | null {
    // ex: "... 12 mai et 19 juin 2000 ..."
    const regexp = / (\d+) ([éûa-z]+) et (\d+) ([éûa-z]+) (\d{4})/
    const res = regexp.exec(standardized)
    if (!res) return null
    const groups = res.slice(1)
    const [day1, month1Str, day2, month2Str, year] = groups
    return [
      `${year}-${parseMonth(month1Str)}-${padDayOrMonth(day1)}`,
      `${year}-${parseMonth(month2Str)}-${padDayOrMonth(day2)}`,
    ]
  }

  function extractSingleDate(): [string] | null {
    // ex: "... 12 juin 2000 ..."
    // has to be used as a last resort otherwise it would match other cases
    const regexp = / (\d+) ([éûa-z]+) (\d{4})/
    const res = regexp.exec(standardized)
    if (!res) return null
    const groups = res.slice(1)
    const [day1, month1Str, year] = groups
    return [`${year}-${parseMonth(month1Str)}-${padDayOrMonth(day1)}`]
  }

  function extractDatesWithDots(): [string, string] | null {
    // happened only once, so we hardcode it
    if (standardized.includes(' 27.06 et 04.07.2004')) {
      return ['2004-06-27', '2004-07-04']
    }
    return null
  }

  const res =
    extractDatesSameMonth() ??
    extractDatesDifferentMonths() ??
    extractSingleDate() ??
    extractDatesWithDots() ??
    null

  if (!res) {
    throw new Error(`Unrecognized date of election in title "${title}"`)
  }
  return res
}

function extractCircoNumber(title: string) {
  const standardized = title
    .replace('1er et 2ème tour', '')
    .replace('1er et 2ème Tour', '')
  const regexs = [
    /-(\d+)eme/,
    / (\d+)° /,
    /^(\d+)° /,
    / (\d+)e /,
    / (\d+)ème /,
    /^(\d+)ème /,
    /^(\d+) ème /,
    / (1)ère /,
    /^(1)ère /,
    /-(1)ere/,
  ]
  const possibleResults = regexs.flatMap(regex => {
    const res = regex.exec(standardized)
    if (res) {
      return [parseInt(res[1], 10)]
    }
    return []
  })
  if (standardized.includes('irconscription unique ')) {
    possibleResults.push(1)
  }
  const res = lo.uniq(possibleResults)
  if (res.length === 1) {
    const singleRes = res[0]
    // in 2020 theres is a circo badly labelled as "99e", but it's the 9th
    return singleRes === 99 ? 9 : singleRes
  }
  throw new Error(
    `Failed to extract the circo number from "${title}, got ${res.toString()}"`,
  )
}

function extractDepartementName(title: string) {
  const dpts_found = departements.filter(dptName => {
    const alternateNames =
      dptName === 'Français établis hors de France'
        ? ["Français de l'étranger", "Français de l'Etranger"]
        : dptName === 'Alpes-Maritimes'
        ? ['Alpes Maritime']
        : dptName === "Val-d'Oise"
        ? ["Val d'Oise"]
        : dptName === 'Eure-et-Loir'
        ? ['Eure et Loir']
        : []
    const possibleNames = [dptName, ...alternateNames]
    return possibleNames.some(n => {
      return (
        title.includes(` ${n} élection`) ||
        title.includes(` ${n} Election`) ||
        title.includes(` ${n} - élection`) ||
        title.includes(` ${n} - Election`) ||
        title.includes(` ${n} - 1er`) ||
        title.includes(`l'${n} `) ||
        title.startsWith(`${n} `) ||
        title.endsWith(` ${n}`) ||
        title.endsWith(`circonscription-${n}`) ||
        title.endsWith(`circonscription-de-${n}`) ||
        title.endsWith(`l'${n}`)
      )
    })
  })
  if (dpts_found.length === 1) {
    return dpts_found[0]
  }
  throw new Error(
    `Failed to extract the departement name from "${title}, got ${dpts_found.toString()}"`,
  )
}

async function getElectionsTitlesForYear(year: number): Promise<string[]> {
  console.log(`>> Fetching elections partielles for ${year}`)
  const url = `https://www.interieur.gouv.fr/Elections/Les-resultats/Partielles/Legislatives/${year}`
  const response = await fetch(url)
  if (response.ok) {
    const html = await response.text()
    const $ = cheerio.load(html)
    const electionsTitles = $('.class-page h4 strong')
      .toArray()
      .map(e => {
        return cheerio(e).text().trim()
      })
    return electionsTitles
  } else if (response.status == 404) {
    return []
  } else {
    throw new Error(`Received ${response.status} from ${url}`)
  }
}
