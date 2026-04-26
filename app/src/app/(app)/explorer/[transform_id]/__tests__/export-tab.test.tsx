import { describe, expect, it } from 'vitest'
import { serializeCypher, serializeGraphML } from '../export-tab'

const fixture = {
  nodes: [
    {
      id: 'n1',
      label: 'Alice',
      type: 'Person',
      properties: { name: 'Alice', age: 30 },
    },
    {
      id: 'n2',
      label: 'Acme Co.',
      type: 'Organization',
      properties: { name: 'Acme Co.', founded: 2015 },
    },
  ],
  edges: [
    {
      id: 'e1',
      source: 'n1',
      target: 'n2',
      type: 'WORKS_AT',
      properties: { since: 2019 },
    },
  ],
  total_nodes: 2,
  total_edges: 1,
}

describe('serializeCypher', () => {
  it('emits CREATE statements for nodes and relationships', () => {
    const out = serializeCypher(fixture)
    // Variable bindings let the relationship line reference earlier
    // nodes without re-MATCHing.
    expect(out).toContain('CREATE (n_n1:Person')
    expect(out).toContain('CREATE (n_n2:Organization')
    expect(out).toContain(
      'CREATE (n_n1)-[:WORKS_AT {since: 2019}]->(n_n2)'
    )
  })

  it('quotes keys that are not bare identifiers with backticks', () => {
    const out = serializeCypher({
      ...fixture,
      nodes: [
        {
          id: 'n1',
          label: 'X',
          type: 'T',
          properties: { 'odd-key': 'v' },
        },
      ],
      edges: [],
    })
    expect(out).toContain('`odd-key`: "v"')
  })

  it('escapes embedded quotes in string values', () => {
    const out = serializeCypher({
      ...fixture,
      nodes: [
        {
          id: 'n1',
          label: 'Q',
          type: 'T',
          properties: { quote: 'she said "hi"' },
        },
      ],
      edges: [],
    })
    expect(out).toContain('quote: "she said \\"hi\\""')
  })

  it('falls back to RELATED_TO for relationships without a type', () => {
    const out = serializeCypher({
      ...fixture,
      edges: [{ id: 'e', source: 'n1', target: 'n2', type: '' }],
    })
    expect(out).toContain(':RELATED_TO')
  })

  it('prefixes labels and relationship types that start with a digit', () => {
    /**
     * Regression: Neo4j's symbolic-name grammar requires the first
     * character to be a letter or underscore. A node type like
     * "3DModel" must serialize to ":_3DModel" not ":3DModel" or
     * the Cypher parser rejects the file at import time.
     */
    const out = serializeCypher({
      nodes: [
        {
          id: 'a',
          label: 'A',
          type: '3DModel',
          properties: {},
        },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'a', type: '3d-related' },
      ],
      total_nodes: 1,
      total_edges: 1,
    })
    // Label survives PascalCase intact except for the leading
    // underscore; relationship type is uppercased per convention,
    // hyphen replaced with underscore, leading underscore prepended.
    expect(out).toContain(':_3DModel')
    expect(out).toContain(':_3D_RELATED')
    // Sanity — the unprefixed forms must NOT appear.
    expect(out).not.toMatch(/:3DModel\b/)
    expect(out).not.toMatch(/:3D_RELATED\b/)
  })
})

describe('serializeGraphML', () => {
  it('emits a valid XML document with declarations and graph body', () => {
    const out = serializeGraphML(fixture)
    expect(out.startsWith('<?xml')).toBe(true)
    expect(out).toContain(
      '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">'
    )
    expect(out).toContain('<graph edgedefault="directed">')
    expect(out).toContain('<node id="n1">')
    expect(out).toContain('<edge id="e1" source="n1" target="n2">')
    expect(out).toContain('</graphml>')
  })

  it('declares <key> entries for every property name seen', () => {
    const out = serializeGraphML(fixture)
    // Node property keys
    expect(out).toContain('attr.name="name"')
    expect(out).toContain('attr.name="age"')
    expect(out).toContain('attr.name="founded"')
    // Edge property keys
    expect(out).toContain('attr.name="since"')
  })

  it('XML-escapes special characters in values and ids', () => {
    const out = serializeGraphML({
      ...fixture,
      nodes: [
        {
          id: 'n<1>',
          label: 'A&B',
          type: 'T',
          properties: { name: 'has "quotes"' },
        },
      ],
      edges: [],
    })
    expect(out).toContain('id="n&lt;1&gt;"')
    expect(out).toContain('A&amp;B')
    expect(out).toContain('has &quot;quotes&quot;')
  })
})
