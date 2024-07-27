import { diff } from 'deep-diff'
import * as lo from 'lodash'
import path from 'path'
import { ActeurJson } from './anopendata/readFromAnOpenData'
import { DATA_DIR } from './nosdeputesFetch'
import { forceArray, readFileAsJson, readFilesInSubdir } from './utils'

export function tmpTool() {
  console.log('--- tmpTool')
  // TODO use this to merge
  // mergeTwoVersionsOfActeurs(null as any, null as any)

  const oldDeport = readDeports('AMO30')
  const newDeports = readDeports('AMO10')
  const allDeports = [...oldDeport, ...newDeports]
  const intersection = newDeports.filter(_ =>
    oldDeport.map(_ => _.uid).includes(_.uid),
  )
  const brandNew = newDeports.filter(
    _ => !oldDeport.map(_ => _.uid).includes(_.uid),
  )

  console.log('stats : ', {
    old: oldDeport.length,
    new: newDeports.length,
    intersection: intersection.length,
    brandNew: brandNew.length,
  })

  intersection.forEach(newOrg => {
    const { uid } = newOrg
    const oldOrg = oldDeport.find(_ => _.uid === uid)
    const differences = diff(oldOrg, newOrg)
    if (differences) {
      console.log(`${uid} => ${differences}.length differences`)
    }
  })
}

function readDeports(dataset: 'AMO30' | 'AMO10'): any[] {
  const dir = path.join(DATA_DIR, 'anopendata', dataset, 'deport')
  const filenames = readFilesInSubdir(dir)
  const res = filenames.map(filename => {
    const organeJson = readFileAsJson(path.join(dir, filename))
    return organeJson
  })
  return res
}

function mergeTwoVersionsOfActeurs(
  amo30Version: ActeurJson,
  amo10Version: ActeurJson,
) {
  let res: ActeurJson = {
    ...amo10Version,
    // AMO10 seems to have uri HATVP, not amo30
    uri_hatvp: amo10Version.uri_hatvp ?? amo30Version.uri_hatvp,
    etatCivil: {
      ...amo10Version.etatCivil,
      // there's slight differences sometimes
      // let's just keep AMO10
      ident: amo10Version.etatCivil.ident ?? amo30Version.etatCivil.ident,
      // idem
      infoNaissance:
        amo10Version.etatCivil.infoNaissance ??
        amo30Version.etatCivil.infoNaissance,
    },
    profession: {
      ...amo10Version.profession,
      libelleCourant:
        amo10Version.profession.libelleCourant ??
        amo30Version.profession.libelleCourant,
      socProcINSEE: {
        catSocPro:
          amo10Version.profession.socProcINSEE.catSocPro ??
          amo30Version.profession.socProcINSEE.catSocPro,
        famSocPro:
          amo10Version.profession.socProcINSEE.famSocPro ??
          amo30Version.profession.socProcINSEE.famSocPro,
      },
    },
    // For adresses, there's numerous modifications/additions/deletions
    // Let's just keep the latest from AMO10, it should be fine
    adresses: amo10Version.adresses,
    // For mandats, we have to use both versions
    // because some mandats are only in AMO10 or AMO30
    // There's some duplicates, but they have same uid and same everything,
    // so we can just deduplicate based on the uid
    mandats: {
      mandat: lo.uniqBy(
        [
          ...forceArray(amo10Version.mandats.mandat),
          ...forceArray(amo30Version.mandats.mandat),
        ],
        _ => _.uid,
      ),
    },
  }

  return res
}
