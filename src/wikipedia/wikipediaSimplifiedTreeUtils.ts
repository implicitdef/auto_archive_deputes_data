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
