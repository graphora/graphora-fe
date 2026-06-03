import React, { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AIConfigForm } from '../ai-config-form'
import type { ProviderConfigRequest, ProviderName } from '@/types/ai-config'

// ---- Fetch mocking --------------------------------------------------------

const MODELS_BY_PROVIDER: Record<string, Array<Record<string, unknown>>> = {
  gemini: [
    { provider_id: 'p-gem', name: 'gemini-2.5-flash', display_name: 'Gemini 2.5 Flash', is_active: true },
    { provider_id: 'p-gem', name: 'gemini-2.5-pro', display_name: 'Gemini 2.5 Pro', is_active: true },
  ],
  openai: [
    { provider_id: 'p-oai', name: 'gpt-4o-mini', display_name: 'GPT-4o mini', is_active: true },
    { provider_id: 'p-oai', name: 'gpt-4o', display_name: 'GPT-4o', is_active: true },
  ],
  anthropic: [
    { provider_id: 'p-ant', name: 'claude-sonnet-4-6', display_name: 'Claude Sonnet 4.6', is_active: true },
  ],
  ollama: [
    { provider_id: 'p-oll', name: 'llama3.3:70b', display_name: 'Llama 3.3 70B', is_active: true },
  ],
}

function installFetchMock() {
  const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    const match = url.match(/\/api\/ai-models\/([a-z]+)/)
    const provider = match?.[1] ?? ''
    const body = MODELS_BY_PROVIDER[provider] ?? []
    return {
      ok: true,
      status: 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as unknown as Response
  })
  vi.stubGlobal('fetch', fetchSpy)
  return fetchSpy
}

beforeEach(() => {
  vi.unstubAllGlobals()
  installFetchMock()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---- Test harness wrapping the controlled form ------------------------

type HarnessProps = {
  initial?: {
    provider?: ProviderName
    config?: Partial<ProviderConfigRequest>
  }
}

function Harness({ initial }: HarnessProps) {
  const [provider, setProvider] = useState<ProviderName>(initial?.provider ?? 'gemini')
  const [config, setConfig] = useState<ProviderConfigRequest>({
    api_key: '',
    default_model_name: '',
    base_url: '',
    ...initial?.config,
  })
  return (
    <AIConfigForm
      provider={provider}
      config={config}
      onProviderChange={setProvider}
      onChange={setConfig}
    />
  )
}

// ---- Tests ------------------------------------------------------------

describe('AIConfigForm', () => {
  it('renders all four supported providers in the dropdown', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await waitFor(() => {
      expect(screen.getByLabelText(/provider/i)).toBeInTheDocument()
    })
    await user.click(screen.getByLabelText(/provider/i))

    // Listbox items
    expect(await screen.findByRole('option', { name: /google gemini/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /openai/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /anthropic claude/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /ollama/i })).toBeInTheDocument()
  })

  it('hides the endpoint URL field for gemini', async () => {
    render(<Harness initial={{ provider: 'gemini' }} />)
    await waitFor(() => {
      expect(screen.getByLabelText(/provider/i)).toBeInTheDocument()
    })
    expect(screen.queryByLabelText(/endpoint url/i)).not.toBeInTheDocument()
  })

  it('shows the endpoint URL field for ollama', async () => {
    render(<Harness initial={{ provider: 'ollama' }} />)
    await waitFor(() => {
      expect(screen.getByLabelText(/endpoint url/i)).toBeInTheDocument()
    })
  })

  it('shows the endpoint URL field for openai (Azure/OpenRouter)', async () => {
    render(<Harness initial={{ provider: 'openai' }} />)
    await waitFor(() => {
      expect(screen.getByLabelText(/endpoint url/i)).toBeInTheDocument()
    })
  })

  it('hides the endpoint URL field for anthropic', async () => {
    render(<Harness initial={{ provider: 'anthropic' }} />)
    await waitFor(() => {
      // Provider dropdown rendered means form is mounted
      expect(screen.getByLabelText(/provider/i)).toBeInTheDocument()
    })
    expect(screen.queryByLabelText(/endpoint url/i)).not.toBeInTheDocument()
  })

  it('toggles to a custom model text input when "Custom model" is picked', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    // Wait for models to load
    await waitFor(() => {
      expect(screen.getByLabelText(/default model/i)).toBeInTheDocument()
    })

    // Open dropdown
    await user.click(screen.getByLabelText(/default model/i))

    // Pick "Custom model..."
    const customOption = await screen.findByRole('option', { name: /custom model/i })
    await user.click(customOption)

    // Text input appears with the placeholder
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/gpt-5-preview/i)).toBeInTheDocument()
    })

    // "Use dropdown instead" affordance present
    expect(screen.getByRole('button', { name: /use dropdown instead/i })).toBeInTheDocument()
  })

  it('fetches /api/ai-models/{provider} when provider changes', async () => {
    const fetchSpy = installFetchMock()
    const user = userEvent.setup()
    render(<Harness />)

    // Initial fetch — gemini
    await waitFor(() => {
      const calls = fetchSpy.mock.calls.map((c) => String(c[0]))
      expect(calls.some((u) => u.endsWith('/api/ai-models/gemini'))).toBe(true)
    })

    // Switch to anthropic
    await user.click(screen.getByLabelText(/provider/i))
    await user.click(await screen.findByRole('option', { name: /anthropic claude/i }))

    // New fetch — anthropic
    await waitFor(() => {
      const calls = fetchSpy.mock.calls.map((c) => String(c[0]))
      expect(calls.some((u) => u.endsWith('/api/ai-models/anthropic'))).toBe(true)
    })
  })

  it('auto-switches to custom mode when the stored model is not in the catalog', async () => {
    // Stored model name is one the catalog doesn't have
    render(
      <Harness
        initial={{
          provider: 'gemini',
          config: { default_model_name: 'gpt-9000-experimental' },
        }}
      />
    )

    // After models load + auto-detect runs, the custom text input should
    // appear with the unrecognized model pre-filled.
    await waitFor(
      () => {
        expect(screen.getByDisplayValue('gpt-9000-experimental')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })
})
