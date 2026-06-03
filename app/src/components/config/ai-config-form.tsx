'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { ProviderConfigRequest, ProviderName, AIModel } from '@/types/ai-config'
import { toast } from 'sonner'

const PROVIDER_LABELS: Record<ProviderName, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
  ollama: 'Ollama (self-hosted)',
}

const PROVIDER_KEY_HELP: Record<ProviderName, { label: string; url: string; placeholder: string }> = {
  gemini: {
    label: 'Get your key from Google AI Studio',
    url: 'https://aistudio.google.com/app/apikey',
    placeholder: 'Enter your Gemini API key',
  },
  openai: {
    label: 'Get your key from OpenAI Platform',
    url: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-...',
  },
  anthropic: {
    label: 'Get your key from Anthropic Console',
    url: 'https://console.anthropic.com/settings/keys',
    placeholder: 'sk-ant-...',
  },
  ollama: {
    label: 'Local servers usually need no API key — enter any placeholder',
    url: 'https://github.com/ollama/ollama',
    placeholder: 'ollama (or any non-empty value)',
  },
}

const PROVIDER_BASE_URL_HELP: Partial<Record<ProviderName, { hint: string; placeholder: string }>> = {
  ollama: {
    hint: 'Ollama server URL — defaults to http://localhost:11434 if blank',
    placeholder: 'http://localhost:11434',
  },
  openai: {
    hint: 'Optional — set for Azure OpenAI, OpenRouter, or other OpenAI-compatible endpoints',
    placeholder: 'https://api.openai.com (default)',
  },
}

const CUSTOM_MODEL_SENTINEL = '__custom__'

interface AIConfigFormProps {
  provider: ProviderName
  config: ProviderConfigRequest
  onProviderChange: (provider: ProviderName) => void
  onChange: (config: ProviderConfigRequest) => void
  disabled?: boolean
  isExistingConfig?: boolean
}

export function AIConfigForm({
  provider,
  config,
  onProviderChange,
  onChange,
  disabled,
  isExistingConfig,
}: AIConfigFormProps) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [models, setModels] = useState<AIModel[]>([])
  const [loadingModels, setLoadingModels] = useState(true)
  const [isCustomModel, setIsCustomModel] = useState(false)

  const keyHelp = PROVIDER_KEY_HELP[provider]
  const baseUrlHelp = PROVIDER_BASE_URL_HELP[provider]
  const showsBaseUrl = !!baseUrlHelp

  const fetchModelsForProvider = useCallback(async (p: ProviderName) => {
    try {
      setLoadingModels(true)
      const response = await fetch(`/api/ai-models/${p}`)
      if (!response.ok) {
        throw new Error('Failed to fetch available models')
      }
      const modelsData: AIModel[] = await response.json()
      setModels(modelsData)
    } catch (error) {
      console.error(`Error fetching ${p} models:`, error)
      toast.error(`Failed to load ${PROVIDER_LABELS[p]} models`)
      setModels([])
    } finally {
      setLoadingModels(false)
    }
  }, [])

  useEffect(() => {
    fetchModelsForProvider(provider)
  }, [provider, fetchModelsForProvider])

  // When models load, detect whether the stored model is in the catalog.
  // If not (and one is set), flip to custom mode so the user sees their
  // value in a text input rather than an empty dropdown.
  useEffect(() => {
    if (loadingModels || !config.default_model_name) return
    const found = models.find((m) => m.name === config.default_model_name)
    if (!found) {
      setIsCustomModel(true)
    }
  }, [models, loadingModels, config.default_model_name])

  const handleProviderChange = (next: string) => {
    const nextProvider = next as ProviderName
    setIsCustomModel(false)
    onProviderChange(nextProvider)
    // Reset key + model + base_url on provider switch — values from one
    // provider don't transfer to another.
    onChange({ api_key: '', default_model_name: '', base_url: '' })
  }

  const handleChange = (field: keyof ProviderConfigRequest, value: string) => {
    onChange({ ...config, [field]: value })
  }

  const handleModelDropdownChange = (value: string) => {
    if (value === CUSTOM_MODEL_SENTINEL) {
      setIsCustomModel(true)
      handleChange('default_model_name', '')
    } else {
      setIsCustomModel(false)
      handleChange('default_model_name', value)
    }
  }

  const testConfiguration = async () => {
    if (!config.api_key || !config.default_model_name) {
      toast.error('Please fill in both API key and select a model before testing')
      return
    }
    setTesting(true)
    try {
      if (config.api_key.length < 6) {
        throw new Error('API key appears to be too short')
      }
      if (provider === 'ollama' && config.base_url && !/^https?:\/\//.test(config.base_url)) {
        throw new Error('Ollama base URL must start with http:// or https://')
      }
      toast.success('Configuration appears valid!')
    } catch (error) {
      toast.error(
        `Configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setTesting(false)
    }
  }

  const modelDropdownValue = useMemo(() => {
    if (isCustomModel) return CUSTOM_MODEL_SENTINEL
    return config.default_model_name
  }, [isCustomModel, config.default_model_name])

  return (
    <div className="space-y-4">
      {/* Provider */}
      <div className="space-y-1.5">
        <Label
          htmlFor="provider"
          style={{ fontSize: 11.5, color: 'var(--fg-muted)', fontWeight: 500 }}
        >
          Provider
        </Label>
        <Select value={provider} onValueChange={handleProviderChange} disabled={disabled}>
          <SelectTrigger id="provider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PROVIDER_LABELS) as ProviderName[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PROVIDER_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* API key */}
      <div className="space-y-1.5">
        <Label
          htmlFor="api_key"
          style={{ fontSize: 11.5, color: 'var(--fg-muted)', fontWeight: 500 }}
        >
          API key
        </Label>
        <div className="relative">
          <Input
            id="api_key"
            type={showApiKey ? 'text' : 'password'}
            placeholder={isExistingConfig ? 'Enter new key to update' : keyHelp.placeholder}
            value={config.api_key}
            onChange={(e) => handleChange('api_key', e.target.value)}
            disabled={disabled}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-7 w-7 p-0"
            onClick={() => setShowApiKey(!showApiKey)}
            disabled={disabled}
            aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
          >
            {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {keyHelp.label}{' '}
          <a
            href={keyHelp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            ↗
          </a>
        </p>
      </div>

      {/* Default model */}
      <div className="space-y-1.5">
        <Label
          htmlFor="default_model"
          style={{ fontSize: 11.5, color: 'var(--fg-muted)', fontWeight: 500 }}
        >
          Default model
        </Label>
        {isCustomModel ? (
          <div className="space-y-1.5">
            <Input
              id="default_model_custom"
              type="text"
              placeholder="e.g., gpt-5-preview-2026, claude-opus-5"
              value={config.default_model_name}
              onChange={(e) => handleChange('default_model_name', e.target.value)}
              disabled={disabled}
            />
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                setIsCustomModel(false)
                handleChange(
                  'default_model_name',
                  models[0]?.name ?? ''
                )
              }}
              disabled={disabled}
            >
              ← Use dropdown instead
            </button>
          </div>
        ) : (
          <Select
            value={modelDropdownValue}
            onValueChange={handleModelDropdownChange}
            disabled={disabled || loadingModels}
          >
            <SelectTrigger id="default_model">
              <SelectValue
                placeholder={
                  loadingModels
                    ? 'Loading models...'
                    : models.length === 0
                      ? 'No catalog models — pick custom'
                      : 'Select a model'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.name} value={model.name}>
                  {model.display_name}
                  {model.version === 'custom' && ' (custom)'}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM_MODEL_SENTINEL}>
                + Custom model…
              </SelectItem>
            </SelectContent>
          </Select>
        )}
        {!loadingModels && models.length === 0 && !isCustomModel && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription className="text-xs">
              No models in the catalog for {PROVIDER_LABELS[provider]}. Pick &quot;Custom model&quot; to enter one manually.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Base URL (Ollama always; OpenAI optional) */}
      {showsBaseUrl && (
        <div className="space-y-1.5">
          <Label
            htmlFor="base_url"
            style={{ fontSize: 11.5, color: 'var(--fg-muted)', fontWeight: 500 }}
          >
            Endpoint URL
          </Label>
          <Input
            id="base_url"
            type="url"
            placeholder={baseUrlHelp.placeholder}
            value={config.base_url ?? ''}
            onChange={(e) => handleChange('base_url', e.target.value)}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">{baseUrlHelp.hint}</p>
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={testConfiguration}
        disabled={
          disabled ||
          testing ||
          !config.api_key ||
          !config.default_model_name
        }
      >
        {testing ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Testing...
          </>
        ) : (
          'Test Configuration'
        )}
      </Button>
    </div>
  )
}
