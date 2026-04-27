import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ontology/yaml-editor', () => ({
  YAMLEditor: ({
    value,
    onChange,
    readOnly,
  }: {
    value: string
    onChange: (v: string) => void
    readOnly?: boolean
  }) => (
    <textarea
      data-testid="yaml-editor"
      data-readonly={String(!!readOnly)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { SchemaTab, type InferredOntologyResponse } from '../schema-tab'

const inferred: InferredOntologyResponse = {
  transform_id: 'tx-1',
  ontology_yaml: 'version: "0.1.0"\nentities:\n  Person: {}\n',
  ontology: { entities: { Person: {} }, relationships: {} },
  stats: { node_count: 3, edge_count: 2, entity_types: 1, relationship_types: 0 },
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  // vi.stubGlobal is NOT cleared by restoreAllMocks — explicit cleanup
  // prevents fetch stubs from leaking into sibling test files when
  // vitest parallelizes workers.
  vi.unstubAllGlobals()
})

function makeFetch(
  responder: (body: string | undefined) => {
    status: number
    body: Record<string, unknown> | string
  }
) {
  return vi.fn(async (_input: RequestInfo, init?: RequestInit) => {
    const body =
      init?.body === undefined ? undefined : (init.body as string)
    const result = responder(body)
    const text =
      typeof result.body === 'string'
        ? result.body
        : JSON.stringify(result.body)
    return new Response(text, {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}

describe('SchemaTab — Accept flow', () => {
  it('Accept without edits posts NO body (server re-infers)', async () => {
    const fetchSpy = makeFetch(() => ({
      status: 200,
      body: {
        ontology_id: 'auto_refined_abc',
        source: 'inferred',
        ontology_yaml: inferred.ontology_yaml,
        ontology: inferred.ontology,
        stats: inferred.stats,
      },
    }))
    vi.stubGlobal('fetch', fetchSpy)

    render(
      <SchemaTab
        transformId="tx-1"
        data={inferred}
        loading={false}
        error={null}
        onRefresh={() => {}}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /^Accept$/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/Saved as ontology/i)
      ).toBeInTheDocument()
    })
    // Bodyless POST — finalize endpoint with no body triggers
    // backend inference path.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    expect(init.body).toBeUndefined()
  })

  it('Accept after editing posts the edited yaml_content', async () => {
    let captured: string | undefined
    const fetchSpy = makeFetch((body) => {
      captured = body
      return {
        status: 200,
        body: {
          ontology_id: 'auto_refined_xyz',
          source: 'user_edit',
          ontology_yaml: '...',
          ontology: { entities: { Researcher: {} }, relationships: {} },
          stats: { ...inferred.stats, entity_types: 1 },
        },
      }
    })
    vi.stubGlobal('fetch', fetchSpy)

    render(
      <SchemaTab
        transformId="tx-1"
        data={inferred}
        loading={false}
        error={null}
        onRefresh={() => {}}
      />
    )

    const editor = screen.getByTestId('yaml-editor') as HTMLTextAreaElement
    await userEvent.clear(editor)
    await userEvent.type(
      editor,
      'version: "0.1.0"\nentities:\n  Researcher: {{}}\n'
    )

    // Edited badge appears.
    expect(screen.getByText(/edited/i)).toBeInTheDocument()
    // Button text changes to "Accept edits".
    await userEvent.click(
      screen.getByRole('button', { name: /Accept edits/i })
    )

    await waitFor(() => {
      expect(captured).toBeDefined()
    })
    const parsed = JSON.parse(captured!) as { yaml_content: string }
    expect(parsed.yaml_content).toContain('Researcher')
    await waitFor(() => {
      expect(screen.getByText(/Saved as ontology/i)).toBeInTheDocument()
      expect(screen.getByText(/auto_refined_xyz/)).toBeInTheDocument()
    })
  })

  it('Reset reverts edited YAML to inferred baseline without a backend call', async () => {
    const fetchSpy = makeFetch(() => ({ status: 200, body: {} }))
    vi.stubGlobal('fetch', fetchSpy)

    render(
      <SchemaTab
        transformId="tx-1"
        data={inferred}
        loading={false}
        error={null}
        onRefresh={() => {}}
      />
    )

    const editor = screen.getByTestId('yaml-editor') as HTMLTextAreaElement
    await userEvent.clear(editor)
    await userEvent.type(editor, 'completely different content')
    expect(screen.getByText(/edited/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Reset/i }))

    expect(editor.value).toBe(inferred.ontology_yaml)
    expect(screen.queryByText(/· edited/i)).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces backend error detail on failed Accept', async () => {
    const fetchSpy = makeFetch(() => ({
      status: 400,
      body: { detail: 'Provided yaml_content has no entities key' },
    }))
    vi.stubGlobal('fetch', fetchSpy)

    const { toast } = await import('react-hot-toast')
    const errorSpy = toast.error as unknown as ReturnType<typeof vi.fn>

    render(
      <SchemaTab
        transformId="tx-1"
        data={inferred}
        loading={false}
        error={null}
        onRefresh={() => {}}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /^Accept$/i }))

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('no entities key')
      )
    })
    // No success banner shown.
    expect(
      screen.queryByText(/Saved as ontology/i)
    ).not.toBeInTheDocument()
  })

  it('clears the saved-banner when a fresh inference lands', async () => {
    const fetchSpy = makeFetch(() => ({
      status: 200,
      body: {
        ontology_id: 'auto_refined_first',
        source: 'inferred',
        ontology_yaml: inferred.ontology_yaml,
        ontology: inferred.ontology,
        stats: inferred.stats,
      },
    }))
    vi.stubGlobal('fetch', fetchSpy)

    const { rerender } = render(
      <SchemaTab
        transformId="tx-1"
        data={inferred}
        loading={false}
        error={null}
        onRefresh={() => {}}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /^Accept$/i }))
    await waitFor(() => {
      expect(screen.getByText(/auto_refined_first/)).toBeInTheDocument()
    })

    // Simulate Re-infer: parent provides a new data object.
    const newInferred = {
      ...inferred,
      ontology_yaml: 'version: "0.1.0"\nentities:\n  Drug: {}\n',
    }
    rerender(
      <SchemaTab
        transformId="tx-1"
        data={newInferred}
        loading={false}
        error={null}
        onRefresh={() => {}}
      />
    )

    expect(
      screen.queryByText(/auto_refined_first/)
    ).not.toBeInTheDocument()
  })
})
