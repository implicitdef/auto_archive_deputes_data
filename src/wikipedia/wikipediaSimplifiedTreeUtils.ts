import pLimit from 'p-limit'
import { isNotNull, sum } from '../utils'
import { Tree } from './wikipediaTreeUtils'

// Less verbose version of "Tree"
export type SimplifiedTree = Node[]
export type Node = ContentNode | TitleNode
export type ContentNode = string
export type TitleNode = {
  title: string
  children: Node[]
}

export function simplifyTree(tree: Tree): SimplifiedTree {
  return tree.map(node => {
    if (node.kind === 'content') {
      return node.text
    }
    return {
      title: node.text,
      children: simplifyTree(node.children),
    }
  })
}

export function removeParagraphs(
  tree: SimplifiedTree,
  removalCriteria: (_: string) => boolean,
): SimplifiedTree {
  function recurse(node: Node): Node | null {
    if (typeof node === 'string') {
      if (removalCriteria(node)) {
        return null
      }
      return node
    } else {
      return {
        ...node,
        children: node.children.map(recurse).filter(isNotNull),
      }
    }
  }
  return tree.map(recurse).filter(isNotNull)
}

export function pruneEmptyTitles(tree: SimplifiedTree): SimplifiedTree {
  function recurse(node: Node): Node | null {
    if (typeof node === 'string') {
      return node
    } else {
      const newNode = {
        ...node,
        children: node.children.map(recurse).filter(isNotNull),
      }
      if (newNode.children.length === 0) {
        return null
      }
      return newNode
    }
  }
  return tree.map(recurse).filter(isNotNull)
}

export function countParagraphs(
  tree: SimplifiedTree,
  criteria: (_: string) => boolean,
): number {
  let nb = 0
  forEachParagraph(tree, p => {
    if (criteria(p)) nb++
  })
  return nb
}

export function forEachParagraph(
  tree: SimplifiedTree,
  callback: (_: string) => void,
) {
  function recurse(node: Node): void {
    if (typeof node === 'string') {
      callback(node)
    } else {
      node.children.forEach(recurse)
    }
  }
  tree.forEach(recurse)
}

export async function mapParagraphsAsync(
  tree: SimplifiedTree,
  callback: (_: string) => Promise<string>,
): Promise<SimplifiedTree> {
  async function recurse(node: Node): Promise<Node> {
    if (typeof node === 'string') {
      return callback(node)
    } else {
      const newChildren = await Promise.all(node.children.map(recurse))
      return {
        ...node,
        children: newChildren,
      }
    }
  }
  return Promise.all(tree.map(recurse))
}
