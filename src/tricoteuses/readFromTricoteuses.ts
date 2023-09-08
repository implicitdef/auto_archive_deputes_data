import path from 'path'
import { AM030 } from './tricoteuses'
import { readFileAsJson, readFilesInSubdir, WORKDIR } from '../utils'

function readOrganesAndFilter<Subtype extends OrganeJson>(
  filterFunction: (o: OrganeJson) => o is Subtype,
): Subtype[] {
  const dir = path.join(WORKDIR, 'anOpenData', 'json', 'organes')
  const filenames = readFilesInSubdir(dir)
  const res = filenames.flatMap(filename => {
    const organeJson = readFileAsJson(path.join(dir, filename)) as OrganeJson
    if (filterFunction(organeJson)) {
      return [organeJson]
    }
    return []
  })
  return res
}

export function readAllAssemblees(): OrganeAssemblee[] {
  return readOrganesAndFilter(isOrganeAssemblee)
}

export function readAllGroupeParlementaires(): OrganeGroupe[] {
  return readOrganesAndFilter(isOrganeGroupe)
}

export function readAllComPerm(): OrganeComPerm[] {
  return readOrganesAndFilter(isOrganeComPerm)
}

export function readAllDeputesAndMap<A>(
  mapFunction: (depute: ActeurJson, legislatures: number[]) => A,
): A[] {
  const dir = path.join(WORKDIR, 'anOpenData', 'json', 'acteurs')
  const filenames = readFilesInSubdir(dir)
  const res: A[] = []
  filenames.flatMap(filename => {
    const deputeJson = readFileAsJson(path.join(dir, filename)) as ActeurJson
    const mandatsAssemblee = deputeJson.mandats.filter(isMandatAssemblee)
    if (mandatsAssemblee.length) {
      // it is a depute
      const legislatures = mandatsAssemblee.map(_ =>
        parseInt(_.legislature, 10),
      )
      res.push(mapFunction(deputeJson, legislatures))
    }
  })
  return res
}

export type ActeurJson = {
  uid: string
  etatCivil: {
    ident: { civ: 'M.' | 'Mme'; nom: string; prenom: string }
    infoNaissance: {
      dateNais: '1949-06-02T01:00:00.000+01:00'
    }
  }
  mandats: Mandat[]

  // there are other fields
}

export type Mandat =
  | MandatAssemblee
  | MandatGroupe
  | MandatComPerm
  | MandatBureau
  | {
      typeOrgane: '__other__'
    }

export type MandatAssemblee = {
  typeOrgane: 'ASSEMBLEE'
  uid: string
  legislature: string
  election: {
    lieu: {
      departement: string
      numDepartement: string
      numCirco: string
    }
    // cette id change à chaque législature
    refCirconscription: string
  }
  suppleant?: {
    suppleantRef: string
  }
  dateFin?: string
  // c'est la date de debut
  mandature: { datePriseFonction: string }
}

export type MandatBureau = {
  typeOrgane: 'BUREAU'
  uid: string
  legislature: string
  dateDebut: string
  dateFin?: string
  infosQualite: {
    codeQualite: string
    libQualite: string
  }
}

export type MandatGroupe = {
  typeOrgane: 'GP'
  legislature: string
  dateFin?: string
  infosQualite: {
    codeQualite: FonctionInGroupe
  }
  organesRefs: [string]
}

export type MandatComPerm = {
  typeOrgane: 'COMPER'
  legislature: string
  dateFin?: string
  infosQualite: {
    codeQualite: FonctionInCom
  }
  organesRefs: [string]
}

export type FonctionInGroupe =
  | 'Président'
  | 'Membre apparenté'
  | 'Membre'
  | 'Député non-inscrit'

export type FonctionInCom =
  | 'Président'
  | 'Membre'
  | 'Rapporteur général'
  | 'Secrétaire'
  | 'Vice-Président'

export function isMandatAssemblee(mandat: Mandat): mandat is MandatAssemblee {
  return mandat.typeOrgane === 'ASSEMBLEE'
}

export function isMandatGroupe(mandat: Mandat): mandat is MandatGroupe {
  return mandat.typeOrgane === 'GP'
}

export function isMandatComPerm(mandat: Mandat): mandat is MandatComPerm {
  return mandat.typeOrgane === 'COMPER'
}

export function isMandatBureau(mandat: Mandat): mandat is MandatBureau {
  return mandat.typeOrgane === 'BUREAU'
}

export type OrganeJson =
  | OrganeAssemblee
  | OrganeGroupe
  | OrganeComPerm
  | {
      codeType: '__other__'
    }

export type OrganeAssemblee = {
  uid: string
  codeType: 'ASSEMBLEE'
  legislature: string
  viMoDe: { dateDebut: string; dateFin?: string }
}

export type OrganeGroupe = {
  uid: string
  codeType: 'GP'
  legislature: string
  libelleAbrev: string
  libelle: string
  couleurAssociee?: string
  positionPolitique?: 'Majoritaire' | 'Minoritaire' | 'Opposition'
}

export type OrganeComPerm = {
  uid: string
  codeType: 'COMPER'
  libelleAbrege: string
  libelleAbrev: string
}

export function isOrganeAssemblee(
  organe: OrganeJson,
): organe is OrganeAssemblee {
  return organe.codeType === 'ASSEMBLEE'
}

export function isOrganeGroupe(organe: OrganeJson): organe is OrganeGroupe {
  return organe.codeType === 'GP'
}

export function isOrganeComPerm(organe: OrganeJson): organe is OrganeComPerm {
  return organe.codeType === 'COMPER'
}
