// https://www.interieur.gouv.fr/Elections/Les-resultats/Partielles/Legislatives
// que en 2020 et avant ?
// si le lien fonctionne aussi pour 2021 https://www.interieur.gouv.fr/Elections/Les-resultats/Partielles/Legislatives/2021

// mais pour 2022 ? pas d'élections partielles ? à verifier
// et pour 2023 ? on en au moins une ici https://www.lemonde.fr/politique/article/2023/01/30/elections-legislatives-partielles-deux-nouveaux-deputes-font-leur-entree-a-l-assemblee-nationale_6159809_823448.html

// post de reference
// https://www.data.gouv.fr/fr/posts/les-donnees-des-elections/

import cheerio from 'cheerio'
import fetch from 'node-fetch'
import lo from 'lodash'
import { departements } from '../departementsRef'

const TITLES_FOUND = [
  '23 ème circonscription du Nord élection des 8 et 15 décembre 2002',
  '3ème circonscription des Yvelines élections des 8 et 15 décembre 2002',
  '7ème circonscription de la Seine-Saint-Denis élections des 16 et 23 mars 2003',
  '3ème circonscription Eure et Loir élections des 16 et 23 mars 2003',
  "5ème circonscription du Val d'Oise élections du 26 janvier et du 2 février 2003",
  '17ème circonscription de Paris - élection des 26 janvier et 2 février 2003 -1er et 2ème tour',
  '15ème circonscription de Paris Election des 20 et 27 juin 2004',
  '8ème circonscription des Yvelines Election des 28 novembre et 5 décembre 2004 - 1er et 2ème tour (Yvelines)',
  '2ème circonscription de la Gironde Election des 14 et 21 novembre 2004',
  '1ère circonscription de la Haute-Loire Election des 27.06 et 04.07.2004',
  '5ème circonscription du Gard Election des 13 et 20 juin 2004 concernant la 5ème criconscription du Gard',
  "4° circonscription de l'Oise - Election des 11 et 18 septembre 2005 - 1er et 2ème Tour",
  '7ème circonscription du Val-de-Marne Election des 25 septembre et 2 octobre 2005 - 1er et 2ème tour',
  '13 ème circonscription des Hauts-de-Seine Election des 25 septembre et 2 octobre 2005 - 1er et 2ème tour',
  '4ème circonscription du Nord Election des 11 et 18 septembre 2005 - 1er et 2ème tour',
  '1ère circonscription de la Meurthe-et-Moselle Election des 4 et 11 septembre 2005 - 1er et 2ème tour',
  '6ème circonscription des Hauts-de-Seine Election du 13 mars 2005',
  '4ème circonscription de la Vendée Election du 23 janvier 2005',
  "8ème circonscription du Val d'Oise - Elections des 9 et 16 décembre 2007 - 1er et 2ème tour",
  'Marne - 1ère circonscription Election législative partielle des 7 et 14 décembre 2008 - 1er et 2ème tour',
  'Gironde - 8ème circonscription Election législative partielle des 23 et 30 novembre 2008 - 1er et 2ème tour',
  'Eure-et-Loir - 1ère circonscription Election législative partielle des 7 et 14 septembre 2008 - 1er et 2ème tour',
  'Rhône - 11° circonscription Election législative partielle des 25 mai et 1er juin 2008 - tour 1 et 2',
  'Alpes Maritime 5ème circonscription - Election législative partielle des 18 et 25 mai 2008 - Tour 1 et 2',
  'Vendée - 5° circonscription - Election législative partielle - 6 avril 2008',
  'Hauts-de-Seine - 12ème circonscription Election des 27 janvier et 3 février 2008 - 1er et 2ème tour',
  'Eure-et-Loir - 1ère circonscription 1ère circonscription - Election des 27 janvier et 3 février 2008 - 1er et 2ème tour',
  'Yvelines - 10ème circonscription Election législative partielle des 20 et 27 septembre 2009 - 1er et 2ème tour',
  'Yvelines - 12° circonscription Election législative partielle des 11 et 18 octobre 2009 - 1er et 2ème tour',
  'Yvelines - 10° circonscription Election législative partielle des 4 et 11 juillet 2010 - 1er et 2ème tour',
  'Hérault - 6ème circonscription - élection législative partielle des 9 et 16 décembre 2012 - 1er et 2nd tours',
  'Hauts-de-Seine - 13ème circonscription - élection législative partielle des 9 et 16 décembre 2012 - 1er et 2nd tours',
  'Val-de-Marne - 1ère circonscription - élection législative partielle des 9 et 16 décembre 2012 - 1er et 2nd tours',
  "Election législative partielle du 17 mars 2013 - 1er tour - 2ème circonscription de l'Oise",
  'Election législative partielle du 17 mars 2013 - 1er tour - Circonscription unique de Wallis-et-Futuna',
  "Election législative partielle des 17 et 24 mars 2013 - 2ème circonscription de l'Oise - 1er et 2ème tour",
  'Election législative partielle des 17 et 24 mars 2013 - Circonscription unique de Wallis-et-Futuna - 1er et 2ème tour',
  'Election législative partielle du 16 et 23 juin 2013 - 1er et 2ème tour - 3ème circonscription du Lot-et-Garonne',
  "Election législative partielle des 26 mai et 9 juin 2013 8ème circonscription des Français de l'Etranger",
  "Élection législative partielle des 26 mai et 9 juin 2013 - 1ère circonscription des Français de l'étranger",
  'Election législative partielle des 25 mai et 1er juin 2014 3ème circonscription de Haute-Garonne',
  'Election législative partielle des 14 et 28 juin 2014 1ère circonscription de la Polynésie Française',
  'Election législative partielle des 22 et 29 juin 2014 21ème circonscription du Nord',
  "Election législative partielle des 7 et 14 décembre 2014 3ème circonscription de l'Aube",
  'Election législative partielle des 1er et 8 février 2015 4ème circonscription du Doubs',
  "Election législative partielle des 13 et 20 septembre 2015 3ème circonscription de l'Aveyron",
  'Election législative partielle des 20 et 27 septembre 2020 - 1e circonscription Haut-Rhin',
  'Election législative partielle des 20 et 27 septembre 2020 - 2e circonscription La Réunion',
  'Election législative partielle des 20 et 27 septembre 2020 - 3e circonscription Maine-et-Loire',
  'Election législative partielle des 20 et 27 septembre 2020 - 5e circonscription Seine-Maritime',
  'Election législative partielle des 20 et 27 septembre 2020 - 99e circonscription Val-de-Marne',
  'Election législative partielle des 20 et 27 septembre 2020 - 11e circonscription Yvelines',
  'Election-legislative-partielle-des-30-mai-et-6-juin-2021-1ere-circonscription-Oise',
  'Election-legislative-partielle-des-30-mai-et-6-juin-2021-3eme-circonscription-Indre-et-Loire',
  'Election-legislative-partielle-des-30-mai-et-6-juin-2021-6eme-circonscription-Pas-de-Calais',
  'Election-legislative-partielle-des-30-mai-et-6-juin-2021-15eme-circonscription-de-Paris',
]

async function fetchAllTitles() {
  const currentYear = new Date().getFullYear()
  const years = lo.range(2002, currentYear + 1)
  const titles: string[] = []
  for (const year of years) {
    titles.push(...(await getElectionsTitlesForYear(year)))
  }
  return titles
}

export async function fetchElectionsPartielles() {
  const titles = TITLES_FOUND
  titles.forEach(title => {
    const [standardized, parsed] = extractCircoNumber(title)
    if (parsed.length !== 1) {
      console.log([standardized, parsed])
    }
  })
}

function extractCircoNumber(title: string) {
  const standardized = title
  // .replace('-circonscription-de-', ' circonscription de ')
  // .replace('-circonscription-', ' circonscription ')
  // .replace(' ème', 'ème')
  // .replace('1ere ', '1ème ')
  // .replace('°', 'ème')
  // .replace(/(\d)e /, '$1ème ')
  // .replace(/(\d)eme /, '$1ème ')

  const regexps = [/-(\d+)eme/]

  return [standardized, [33, 35]]
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
  return dpts_found
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
