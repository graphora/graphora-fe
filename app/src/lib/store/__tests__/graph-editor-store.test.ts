import { beforeEach, describe, expect, it } from 'vitest'
import { useGraphEditorStore } from '../graph-editor-store'
import { Point } from '@/lib/utils/point'

const createPoint = (x: number, y: number): Point => new Point(x, y)

describe('useGraphEditorStore', () => {
  beforeEach(() => {
    useGraphEditorStore.getState().reset()
  })

  it('creates nodes with generated identifiers and metadata', () => {
    const { addNode } = useGraphEditorStore.getState()
    const firstId = addNode(createPoint(10, 20), 'Person', ['Person'])

    expect(firstId).toBeTypeOf('string')
    const firstNode = useGraphEditorStore.getState().graph.nodes[firstId]
    expect(firstNode.caption).toBe('Person')
    expect(firstNode.labels).toContain('Person')

    const secondId = addNode(createPoint(50, 80), 'Company', ['Company'])
    expect(secondId).not.toBe(firstId)
  })

  it('resets to an empty graph', () => {
    const store = useGraphEditorStore.getState()
    store.addNode(createPoint(0, 0), 'Sample')

    expect(Object.keys(useGraphEditorStore.getState().graph.nodes)).toHaveLength(1)

    store.reset()
    expect(Object.keys(useGraphEditorStore.getState().graph.nodes)).toHaveLength(0)
    expect(Object.keys(useGraphEditorStore.getState().graph.relationships)).toHaveLength(0)
  })
})
