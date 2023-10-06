import { getLast, isNotNull } from '../utils'

export type Tag = {
  tagName: string
  text: string
}

function getTitleLevel(tag: Tag): number | null {
  const match = tag.tagName.match(/^h([1-6])$/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

export type Tree = Node[]
export type Node = ContentNode | TitleNode
export type ContentNode = {
  kind: 'content'
  text: string
}
export type TitleNode = {
  kind: 'title'
  level: number
  text: string
  children: Node[]
}

export function buildTreeFromTags(tags: Tag[]): Tree {
  const tree: Tree = []
  tags.forEach(tag => {
    const level = getTitleLevel(tag)
    if (level !== null) {
      // Create a new TitleNode for the tag
      const newNode: TitleNode = {
        kind: 'title',
        level,
        text: tag.text,
        children: [],
      }
      const latestTitleNode = findLatestTitleNodeWithMaxLevel(tree, level - 1)
      if (latestTitleNode) {
        latestTitleNode.children.push(newNode)
      } else {
        // no title found yet
        tree.push(newNode)
      }
    } else {
      // It's content
      const newNode: ContentNode = {
        kind: 'content',
        text: tag.text,
      }
      const latestTitleNode = findLatestTitleNode(tree)
      if (latestTitleNode) {
        latestTitleNode.children.push(newNode)
      } else {
        // no title found yet
        tree.push(newNode)
      }
    }
  })

  return tree
}

export function dropTitleNodes(tree: Tree, targetTexts: string[]): Tree {
  return tree
    .map(node => {
      if (node.kind === 'title') {
        if (
          targetTexts
            .map(_ => _.toLowerCase())
            .includes(node.text.toLowerCase())
        ) {
          // drop it
          return null
        }
        return {
          ...node,
          // recurse
          children: dropTitleNodes(node.children, targetTexts),
        }
      }
      return node
    })
    .filter(isNotNull)
}

function isTitle(node: Node): node is TitleNode {
  return node.kind === 'title'
}
function isTitleWithMaxLevel(maxLevel: number | undefined) {
  return function (node: Node): node is TitleNode {
    return (
      node.kind === 'title' &&
      (maxLevel === undefined || node.level <= maxLevel)
    )
  }
}

function findLatestTitleNode(tree: Tree, debug: boolean = false) {
  function recurse(node: TitleNode): TitleNode {
    const lastTitleChild = getLast(node.children.filter(isTitle))
    return lastTitleChild ? recurse(lastTitleChild) : node
  }
  const lastTitle = getLast(tree.filter(isTitle))
  if (!lastTitle) {
    return undefined
  }
  return recurse(lastTitle)
}

function findLatestTitleNodeWithMaxLevel(
  tree: Tree,
  maxLevel: number | undefined,
): TitleNode | undefined {
  const filterFunc = isTitleWithMaxLevel(maxLevel)
  function recurse(node: TitleNode): TitleNode {
    const lastTitleChild = getLast(node.children.filter(filterFunc))
    return lastTitleChild ? recurse(lastTitleChild) : node
  }
  const lastTitle = getLast(tree.filter(filterFunc))
  if (!lastTitle) {
    return undefined
  }
  return recurse(lastTitle)
}
