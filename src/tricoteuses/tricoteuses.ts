import path from 'path'
import { rmDirIfExists, runCmd } from '../utils'
import { WORKDIR } from '../utils'

export const AM030 = 'AMO30_tous_acteurs_tous_mandats_tous_organes_historique'

export function tricoteusesClone() {
  const datasetName = AM030
  console.log(`Cloning the tricoteuses dataset into ${WORKDIR}`)
  const targetDir = path.join(WORKDIR, 'tricoteuses', datasetName)
  rmDirIfExists(targetDir)
  runCmd(
    `git clone https://git.en-root.org/tricoteuses/data/assemblee-nettoye/${datasetName}_nettoye.git --depth=1 ${targetDir}`,
  )
  console.log('Done')
}
