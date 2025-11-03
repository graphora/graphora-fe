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

  it('round-trips canonicalisation metadata for nodes and relationships', () => {
    const store = useGraphEditorStore.getState()
    const ontology = {
      version: '1.0.0',
      entities: {
        Company: {
          properties: {
            name: {
              type: 'str',
              canonicalization: {
                strip_punctuation: true,
                strip_suffixes: ['Inc', 'Ltd'],
              },
            },
            ticker: {
              type: 'str',
              canonicalization: {
                preserve_case: true,
              },
            },
          },
          relationships: {
            HAS_RISK: {
              target: 'Risk',
              properties: {
                description: {
                  type: 'str',
                  canonicalization: {
                    remove_non_alnum: true,
                  },
                },
              },
            },
          },
        },
        Risk: {
          properties: {
            category: {
              type: 'str',
              canonicalization: {
                strip_company_suffixes: true,
              },
            },
          },
        },
      },
    }

    store.fromOntology(ontology)

    const state = useGraphEditorStore.getState()
    const companyNode = Object.values(state.graph.nodes).find(node => node.caption === 'Company')
    expect(companyNode?.properties.name.canonicalization?.strip_punctuation).toBe(true)
    expect(companyNode?.properties.name.canonicalization?.strip_suffixes).toEqual(['Inc', 'Ltd'])
    expect(companyNode?.properties.ticker.canonicalization?.preserve_case).toBe(true)

    const hasRiskRelationship = Object.values(state.graph.relationships).find(
      relationship => relationship.type === 'HAS_RISK',
    )
    expect(hasRiskRelationship?.properties.description.canonicalization?.remove_non_alnum).toBe(true)

    const riskNode = Object.values(state.graph.nodes).find(node => node.caption === 'Risk')
    expect(riskNode?.properties.category.canonicalization?.strip_company_suffixes).toBe(true)

    const roundTripped = state.toOntology()

    expect(roundTripped.entities.Company.properties.name.canonicalization).toEqual({
      strip_punctuation: true,
      strip_suffixes: ['Inc', 'Ltd'],
    })
    expect(roundTripped.entities.Company.properties.ticker.canonicalization).toEqual({
      preserve_case: true,
    })
    expect(
      roundTripped.entities.Company.relationships.HAS_RISK.properties.description.canonicalization,
    ).toEqual({
      remove_non_alnum: true,
    })
    expect(roundTripped.entities.Risk.properties.category.canonicalization).toEqual({
      strip_company_suffixes: true,
    })
  })
})
