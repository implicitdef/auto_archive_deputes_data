import * as lo from 'lodash'
import path from 'path'
import { DATA_DIR } from '../nosdeputesFetch'
import {
  OnCopyingFileConflict,
  WORKDIR,
  copyFiles,
  downloadFile,
  forceArray,
  listFilesOrDirsInFolder,
  move,
  rmDirIfExists,
  rmDirsIfExists,
  rmFileIfExists,
  unnestDirContents,
  unzipIntoDir,
} from '../utils'
import { cleanupJsonFile } from './cleanOpenData'
import { ActeurJson } from './readFromAnOpenData'

type Dataset = {
  name: string
  url: string
}
const AMO30: Dataset = {
  name: 'AMO30',
  url: 'https://data.assemblee-nationale.fr/static/openData/repository/16/amo/tous_acteurs_mandats_organes_xi_legislature/AMO30_tous_acteurs_tous_mandats_tous_organes_historique.json.zip',
} as const
const AMO10: Dataset = {
  name: 'AMO10',
  url: 'https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip',
} as const

const anOpenDataWorkDir = path.join(WORKDIR, 'anopendata')

export async function fetchAndMergeAnDatasets() {
  const dirPathAmo30 = await fetchAndCleanDataset(AMO30)
  const dirPathAmo10 = await fetchAndCleanDataset(AMO10)
  const dirPathMerge = path.join(anOpenDataWorkDir, 'AMO30_AMO10_merged')
  rmDirIfExists(dirPathMerge)
  mergeSubfolder({
    dirPathAmo10,
    dirPathAmo30,
    dirPathMerge,
    subfolderName: 'acteur',
  })
  mergeSubfolder({
    dirPathAmo10,
    dirPathAmo30,
    dirPathMerge,
    subfolderName: 'organe',
  })
  mergeSubfolder({
    dirPathAmo10,
    dirPathAmo30,
    dirPathMerge,
    subfolderName: 'deport',
  })
  const finalPath = path.join(DATA_DIR, 'anopendata', 'AMO30_AMO10_merged')
  rmDirIfExists(finalPath)
  console.log(`Moving ${dirPathMerge} to ${finalPath}`)
  move({ currentPath: dirPathMerge, newPath: finalPath })
  rmDirsIfExists(dirPathAmo10, dirPathAmo30, dirPathMerge)
}

function mergeSubfolder({
  dirPathAmo10,
  dirPathAmo30,
  dirPathMerge,
  subfolderName,
}: {
  dirPathAmo30: string
  dirPathAmo10: string
  dirPathMerge: string
  subfolderName: 'acteur' | 'organe' | 'deport'
}) {
  const onConflict: OnCopyingFileConflict =
    // When an acteur file is present both in AMO10 and AMO30
    // there's interesting stuff to get from both
    // we need to do a complex custom merge
    subfolderName === 'acteur'
      ? {
          kind: 'mergeMethod',
          method: ({ jsonOfExistingFile, jsonOfFileToCopyIn }) =>
            mergeTwoVersionsOfActeurs({
              amo10Version: jsonOfFileToCopyIn,
              amo30Version: jsonOfExistingFile,
            }),
        }
      : // for organes and deport, if the filename is the same
        // then the files have exactly the same content
        // we can keep either version
        'overwrite'
  copyFiles({
    srcDir: path.join(dirPathAmo30, subfolderName),
    destDir: path.join(dirPathMerge, subfolderName),
    onConflict: 'throw',
  })
  copyFiles({
    srcDir: path.join(dirPathAmo10, subfolderName),
    destDir: path.join(dirPathMerge, subfolderName),
    onConflict,
  })
}

function mergeTwoVersionsOfActeurs({
  amo30Version,
  amo10Version,
}: {
  amo30Version: ActeurJson
  amo10Version: ActeurJson
}): ActeurJson {
  return {
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
}

async function fetchAndCleanDataset({ name, url }: Dataset): Promise<string> {
  console.log(`~ Starting to work on dataset ${name} ~`)
  const zipPath = path.join(anOpenDataWorkDir, `${name}.zip`)
  const unzippedDirPath = path.join(anOpenDataWorkDir, name)
  rmFileIfExists(zipPath)
  rmDirIfExists(unzippedDirPath)
  await downloadFile({ url, targetPath: zipPath })
  await unzipIntoDir({ zipFile: zipPath, unzippedDirPath })
  rmFileIfExists(zipPath)
  // there's a single folder named 'json', we can hoist the contents
  unnestDirContents(unzippedDirPath)
  listFilesOrDirsInFolder(unzippedDirPath).forEach(subDirs => {
    listFilesOrDirsInFolder(subDirs).forEach(file => {
      cleanupJsonFile(file)
    })
  })
  return unzippedDirPath
}
