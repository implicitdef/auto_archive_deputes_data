import slugify from 'slugify'

// returns small chunks of the paragraph that seem to contain
// an affaire-related keyword
// ex :
// - ochegude suite a l affaire d annecy frederic c
// - et l initiative est condamnee tant par la presi
export function searchParagraphForAffairesKeywords(
  paragraph: string,
): string[] {
  const slug = makeSlug(paragraph)
  const allMatches = keywords.flatMap(k => {
    return findMatches(slug, k)
  })
  return allMatches
}

const keywords = [
  'polemique',
  'controverse',
  'affaire',
  'illegal',
  'scandale',
  'justice',
  'soupcons',
  'accusation',
  'enquete',
  'condamn',
  'harcelement',
  'mis en examen',
  'mise en examen',
  `prise illegale`,
  `de fonds publics`,
  'ineligibilite',
  'favoritisme',
  'clientelisme',
  'premiere instance',
  'procedure abusive',
  'cassation',
  'corruption',
  'proces',
  'delit',
  'crime',
  'penal',
  'abus',
].map(makeSlug)

const excluded_keywords = [
  'acrimed',
  'processus',
  'homme d affaires',
  'charge d affaires',
  'commission des affaires',
  'affaires rurales',
  'affaires sociales',
  'affaires locales',
  'affaires etrangeres',
  'affaires europeennes',
  'affaires internationale',
  'affaires culturelles',
  'affaires economiques',
  'reconversion dans les affaires',
  'justice garde des sceaux',
  'commission d enquete parlementaire',
].map(makeSlug)

function findMatches(paragraph_slug: string, keyword_slug: string): string[] {
  // Convert keyword_slug into a regex pattern
  const keywordRegex = new RegExp(keyword_slug.replace(/ /g, '\\s'), 'g')
  const matches: string[] = []
  let match
  while ((match = keywordRegex.exec(paragraph_slug)) !== null) {
    // Calculate the start and end index for the context
    const start = Math.max(0, match.index - 20)
    const end = Math.min(
      paragraph_slug.length,
      match.index + match[0].length + 20,
    )
    // Extract the context
    matches.push(paragraph_slug.substring(start, end))
  }
  const matchesFiltered = matches.filter(
    _ => !excluded_keywords.some(excKw => _.includes(excKw)),
  )
  return matchesFiltered
}

function makeSlug(s: string) {
  const s2 = s.replaceAll('’', ' ').replaceAll("'", ' ').replaceAll('-', ' ')
  return slugify(
    // slugify will just drop some characters
    // we want to keep a space
    s2,
    {
      lower: true,
      strict: true,
      replacement: ' ',
    },
  )
}
