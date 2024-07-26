import { diff, Diff } from 'deep-diff'
import * as lo from 'lodash'
import { readAllDeputesAndMap } from '../anopendata/readFromAnOpenData'

export function tmpTool() {
  console.log('--- tmpTool')

  const deputesAMO10 = readAllDeputesAndMap(a => a, 'AMO10')
  const deputesAMO30 = readAllDeputesAndMap(a => a, 'AMO30')

  console.log(deputesAMO10.length)
  console.log(deputesAMO30.length)

  const idsPresentInBoth = lo.intersection(
    deputesAMO10.map(_ => _.uid['#text']),
    deputesAMO30.map(_ => _.uid['#text']),
  )

  console.log('@@ intersection', idsPresentInBoth.length)

  deputesAMO10
    .filter(_ => idsPresentInBoth.includes(_.uid['#text']))
    .slice(0, 1)
    .forEach(dep => {
      const uid = dep.uid['#text']
      const { civ, nom, prenom } = dep.etatCivil.ident
      const fullname = `${civ} ${nom} ${prenom}`
      console.log(`---------------------------------------------`)
      console.log(`${uid} ${fullname} was already in previous legislature`)
      const oldDept = deputesAMO30.find(_ => _.uid['#text'])
      if (!oldDept) {
        throw new Error(`cannot find previous one for ${fullname}`)
      }

      const differences: Diff<any, any>[] | undefined = diff(oldDept, dep)

      // if (differences) {
      //   differences.forEach(difference => {
      //     console.log(difference)
      //   })
      // } else {
      //   console.log('No differences found')
      // }
    })
}
