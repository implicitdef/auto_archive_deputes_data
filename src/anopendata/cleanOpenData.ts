import { writeFileSync } from 'fs'
import { readFileAsJson } from '../utils'

export function cleanupJsonFile(filePath: string) {
  const json = readFileAsJson(filePath)
  // there is a useless root level, unnest it
  const keys = Object.keys(json)
  if (keys.length !== 1) {
    throw new Error(`${filePath} contains ${keys.length} key(s) : ${keys}`)
  }
  let subJson = json[keys[0]]
  subJson = removeUselessKeyFromJsonRecursively(subJson, '@xmlns:xsi')
  subJson = removeUselessKeyFromJsonRecursively(subJson, '@xmlns')
  subJson = removeNilObjects(subJson)
  // overwrite the file with the new version
  writeFileSync(filePath, JSON.stringify(subJson, null, 2))
}

function removeNilObjects(json: any) {
  // sometimes theres things like :
  //  "trigramme": {
  //    "@xsi:nil": "true"
  //  }
  // let's just remove them
  return removeSomeValuesRecursively(json, value => {
    return (
      typeof value === 'object' &&
      value !== null &&
      Object.keys(value).length === 1 &&
      value['@xsi:nil'] === 'true'
    )
  })
}
function removeSomeValuesRecursively(
  json: any,
  shouldRemove: (value: any) => boolean,
) {
  function inner(o: any): any {
    if (Array.isArray(o)) {
      return o.map(item => inner(item))
    } else if (typeof o === 'object' && o !== null) {
      for (const key in o) {
        const value = o[key]
        if (shouldRemove(value)) {
          delete o[key]
        } else {
          o[key] = inner(value)
        }
      }
    }
    return o
  }
  return inner(json)
}

function removeUselessKeyFromJsonRecursively(json: any, uselessKey: string) {
  function inner(o: any): any {
    if (Array.isArray(o)) {
      return o.map(item => inner(item))
    } else if (typeof o === 'object' && o !== null) {
      if (Object.prototype.hasOwnProperty.call(o, uselessKey)) {
        delete o[uselessKey]
      }
      for (const key in o) {
        o[key] = inner(o[key])
      }
    }
    return o
  }
  return inner(json)
}
