// Source
// https://fr.wikipedia.org/wiki/%C3%89lection_l%C3%A9gislative_fran%C3%A7aise_partielle

import { JSDOM } from 'jsdom'
import fetch from 'node-fetch'
import path from 'path'
import { departements } from '../departementsRef'
import { DATA_DIR } from './nosdeputesFetch'
import { writeToFile } from './utils'
import lo from 'lodash'
export async function fetchElectionsPartiellesFromWikipedia() {
  const titles = await fetchTitles()

  const finalRes = lo.sortBy(
    titles.flatMap(title => {
      const circoNumber = extractCircoNumber(title)
      const dpt = extractDepartementName(title)
      const tours = extractDates(title)
      if (tours.length === 0) {
        // filter out future elections without a set date yet
        return []
      }
      return [
        {
          tours,
          dpt,
          circoNumber,
        },
      ]
    }),
    _ => `${_.tours[0]} ${_.tours[1]} ${_.dpt} ${_.circoNumber}`,
  )
  const filePath = path.join(
    DATA_DIR,
    'electionspartielles',
    'electionspartielles_wikipedia.json',
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

function extractDates(title: string): [string] | [string, string] | [] {
  const standardized = title.toLowerCase().replace('1er', '1')

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

  const res =
    extractDatesSameMonth() ??
    extractDatesDifferentMonths() ??
    extractSingleDate() ??
    // wikipedia includes some later elections for which the date isn't set yet
    // so we accept to not return any date
    []

  return res
}

function extractCircoNumber(title: string) {
  const t = title.toLowerCase().replaceAll('é', 'e').replaceAll('è', 'e')
  const firstWord = t.split(' ')[0]
  const mapping = [
    'premiere',
    'deuxieme',
    'troisieme',
    'quatrieme',
    'cinquieme',
    'sixieme',
    'septieme',
    'huitieme',
    'neuvieme',
    'dixieme',
    'onzieme',
    'douzieme',
    'treizieme',
    'quatorzieme',
    'quinzieme',
    'seizieme',
    'dix-septieme',
    'dix-huitieme',
    'dix-neuvieme',
    'vingtieme',
    'vingt-et-unieme',
    'vingt-deuxieme',
    'vingt-troisieme',
    'vingt-quatrieme', // 24 est le numéro de circo maximum
  ]
  const index = mapping.findIndex(_ => _ === firstWord)
  if (index !== -1) {
    return index + 1
  }
  if (firstWord === 'circonscription') {
    return 1
  }
  throw new Error(`Failed to extract circo number from "${title}"`)
}

function extractDepartementName(title: string) {
  const title2 = title.replaceAll(', ', ' ').toLowerCase()
  const dpts_found = departements.filter(dpt => {
    const dptLowerCase = dpt.toLowerCase()
    const alternateNames =
      dptLowerCase === 'français établis hors de france'
        ? ["français de l'étranger", "français de l'etranger"]
        : dptLowerCase === 'alpes-maritimes'
        ? ['alpes maritime']
        : dptLowerCase === "val-d'oise"
        ? ["val d'oise"]
        : dptLowerCase === 'wallis-et-futuna'
        ? ['wallis et futuna']
        : []
    const possibleNames = [dptLowerCase, ...alternateNames]
    // console.log('@@@ working on ', title2)
    return possibleNames.some(n => {
      return (
        title2.includes(` du ${n} `) ||
        title2.includes(` des ${n} `) ||
        title2.endsWith(` des ${n}`) ||
        title2.includes(` d'${n} `) ||
        title2.includes(` de la ${n} `) ||
        title2.includes(` de l'${n} `) ||
        title2.endsWith(` de l'${n}`) ||
        title2.includes(` de ${n} `)
      )
    })
  })
  if (dpts_found.length === 1) {
    return dpts_found[0]
  }
  throw new Error(
    `Failed to extract the departement name from "${title}", got ${dpts_found.toString()}`,
  )
}

async function fetchTitles() {
  const url =
    'https://fr.wikipedia.org/wiki/%C3%89lection_l%C3%A9gislative_fran%C3%A7aise_partielle'

  console.log(`>> ${url}`)
  const response = await fetch(url)
  if (response.ok) {
    const html = await response.text()
    const dom = new JSDOM(html)

    const h4s = [
      ...dom.window.document.querySelectorAll('.mw-parser-output h4'),
    ]
    const titles = h4s.flatMap(h4 => {
      const yearStr = h4.querySelector('.mw-headline')?.textContent?.slice(-4)
      if (yearStr && parseInt(yearStr, 10) >= 2002) {
        const next = h4.nextElementSibling
        if (next?.tagName.toLowerCase() === 'ul') {
          return [...next.children].map(child => {
            return child.textContent?.trim() ?? ''
          })
        }
      }
      return []
    })
    return titles
  } else {
    throw new Error(`Got ${response.status} from ${url}`)
  }
}
