'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { GeminiConfigRequest, AIModel } from '@/types/ai-config'
import { toast } from 'sonner'

interface GeminiConfigFormProps {
  config: GeminiConfigRequest
  onChange: (config: GeminiConfigRequest) => void
  disabled?: boolean
  isExistingConfig?: boolean
}

export function GeminiConfigForm({ config, onChange, disabled, isExistingConfig }: GeminiConfigFormProps) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [models, setModels] = useState<AIModel[]>([])
  const [loadingModels, setLoadingModels] = useState(true)

  const fetchAvailableModels = useCallback(async () => {
    try {
      setLoadingModels(true)
      const response = await fetch('/api/ai-models/gemini')
      if (!response.ok) {
        throw new Error('Failed to fetch available models')
      }

      const modelsData: AIModel[] = await response.json()
      setModels(modelsData)

      if (modelsData.length > 0 && !config.default_model_name) {
        onChange({
          ...config,
          default_model_name: modelsData[0].name,
        })
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      toast.error('Failed to load available models')
      setModels([])
    } finally {
      setLoadingModels(false)
    }
  }, [config, onChange])

  useEffect(() => {
    fetchAvailableModels()
  }, [fetchAvailableModels])

  const handleChange = (field: keyof GeminiConfigRequest, value: string) => {
    onChange({
      ...config,
      [field]: value,
    })
  }

  const testConfiguration = async () => {
    if (!config.api_key || !config.default_model_name) {
      toast.error('Please fill in both API key and select a model before testing')
      return
    }

    try {
      setLoading(true)
      if (config.api_key.length < 10) {
        throw new Error('API key appears to be too short')
      }

      toast.success('Configuration appears valid!')
    } catch (error) {
      console.error('Error testing configuration:', error)
      toast.error(`Configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="api_key" className="text-xs">API Key</Label>
        <div className="relative">
          <Input
            id="api_key"
            type={showApiKey ? 'text' : 'password'}
            placeholder={isExistingConfig ? 'Enter new key to update' : 'Enter your Gemini API key'}
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
          Get your key from{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Google AI Studio
          </a>
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="default_model" className="text-xs">Default Model</Label>
        <Select
          value={config.default_model_name}
          onValueChange={(value) => handleChange('default_model_name', value)}
          disabled={disabled || loadingModels || models.length === 0}
        >
          <SelectTrigger id="default_model">
            <SelectValue
              placeholder={
                loadingModels
                  ? 'Loading models...'
                  : models.length === 0
                    ? 'No models available'
                    : 'Select a model'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.name} value={model.name}>
                {model.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!loadingModels && models.length === 0 && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription className="text-xs">
              No models available. Try again later.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={testConfiguration}
        disabled={disabled || loading || !config.api_key || !config.default_model_name || models.length === 0}
      >
        {loading ? (
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
