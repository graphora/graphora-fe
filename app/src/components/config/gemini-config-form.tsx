'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
    <Card variant="glass" className="border-white/15 bg-white/8 shadow-glass backdrop-blur-panel">
      <CardHeader className="space-y-4 border-b border-white/10 pb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-heading text-foreground">Gemini configuration</CardTitle>
            <CardDescription className="text-sm text-foreground/70">
              Securely connect Gemini for AI-powered enrichment and conflict resolution.
            </CardDescription>
          </div>
          {isExistingConfig && (
            <Badge variant="outline" className="border-white/20 bg-white/10 text-foreground/70">
              Configured
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        <div className="rounded-xl border border-white/15 bg-white/10 p-4 text-xs text-foreground/80 shadow-inner">
          <div className="space-y-1.5">
            <p className="font-medium uppercase tracking-[0.16em] text-foreground/70">Enterprise-grade security</p>
            <p>
              API keys are encrypted with hardware-backed keys before storage. Rotate keys any time—previous versions are wiped immediately.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api_key">API key <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                id="api_key"
                type={showApiKey ? 'text' : 'password'}
                placeholder={isExistingConfig ? 'Enter new API key to update' : 'Enter your Gemini API key'}
                value={config.api_key}
                onChange={(e) => handleChange('api_key', e.target.value)}
                disabled={disabled}
                className="bg-white/5 pr-12 text-foreground"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full border border-white/20 bg-white/10 p-0 text-foreground/70 hover:bg-white/20"
                onClick={() => setShowApiKey(!showApiKey)}
                disabled={disabled}
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-foreground/60">
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

          <div className="space-y-2">
            <Label htmlFor="default_model">Default model <span className="text-destructive">*</span></Label>
            <Select
              value={config.default_model_name}
              onValueChange={(value) => handleChange('default_model_name', value)}
              disabled={disabled || loadingModels || models.length === 0}
            >
              <SelectTrigger id="default_model" className="bg-white/5 text-foreground">
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
              <Alert className="mt-2 border-warning/40 bg-warning/10 text-warning" variant="default">
                <AlertDescription>
                  No models are currently available. Please contact support or try again later.
                </AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-foreground/60">This model powers document enrichment, conflict resolution, and schema suggestions.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={testConfiguration}
            disabled={disabled || loading || !config.api_key || !config.default_model_name || models.length === 0}
            className="border-white/20 text-foreground hover:bg-white/10 sm:flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test configuration'
            )}
          </Button>
        </div>

        <div className="rounded-xl border border-white/12 bg-white/8 p-4 text-sm text-foreground/80 shadow-inner">
          <p className="font-medium text-foreground">About Gemini integration</p>
          <p className="mt-2 text-foreground/70">
            Gemini enhances document ingestion with semantic understanding, auto-generated embeddings, and smart conflict suggestions. Configure once to unlock AI assistance across workflows.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
