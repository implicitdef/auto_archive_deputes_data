import * as fs from 'fs'

console.log('@@ hello index.ts')

fs.appendFileSync(
  './data/data.txt',
  `foobar ${new Date().toISOString()}\n`,
  'utf-8',
)
