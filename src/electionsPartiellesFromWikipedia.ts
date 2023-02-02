// Source
// https://fr.wikipedia.org/wiki/%C3%89lection_l%C3%A9gislative_fran%C3%A7aise_partielle

import cheerio from 'cheerio'
import fetch from 'node-fetch'
import lo from 'lodash'
import { departements } from '../departementsRef'
import path from 'path'
import { DATA_DIR } from './nosdeputesFetch'
import { writeToFile } from './utils'
import { JSDOM } from 'jsdom'

export async function fetchElectionsPartiellesFromWikipedia() {
  const titles = await fetchTitles()

  for (const title of titles) {
    console.log('Extracting from ', title)
    const res = extractDepartementName(title)
    console.log([title, res])
  }
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
        : []
    const possibleNames = [dptName, ...alternateNames]
    return possibleNames.some(n => {
      return (
        title.includes(` ${n} `) ||
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
