'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle, Sparkles, ExternalLink } from 'lucide-react'
import { GeminiConfigRequest, AIModel, UserAIConfigDisplay } from '@/types/ai-config'
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
      
      // Set the first available model as default if no model is currently selected
      if (modelsData.length > 0 && !config.default_model_name) {
        onChange({
          ...config,
          default_model_name: modelsData[0].name
        })
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      toast.error('Failed to load available models')
      // Set empty array - we'll show an error message instead of fallback hardcoded models
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
      
      // For now, we'll just validate the API key format
      // In the future, you could make an actual test call to Gemini API
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
    <div className="space-y-6">
      {/* Security Information */}
      <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-3 w-3 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="space-y-2">
              <p className="text-xs font-medium text-green-800 dark:text-green-200">
                Enterprise-Grade Security
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                Your Gemini API key is protected with industry-standard AES encryption 
                and key derivation. We follow OWASP security guidelines 
                and never store your credentials in plaintext.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api_key" className="text-sm font-medium">
            API Key <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="api_key"
              type={showApiKey ? 'text' : 'password'}
              placeholder={isExistingConfig ? 'Enter new API key to update' : 'Enter your Gemini API key'}
              value={config.api_key}
              onChange={(e) => handleChange('api_key', e.target.value)}
              disabled={disabled}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowApiKey(!showApiKey)}
              disabled={disabled}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get your API key from{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Google AI Studio
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="default_model" className="text-sm font-medium">
            Default Model <span className="text-destructive">*</span>
          </Label>
          <Select
            value={config.default_model_name}
            onValueChange={(value) => handleChange('default_model_name', value)}
            disabled={disabled || loadingModels || models.length === 0}
          >
            <SelectTrigger id="default_model">
              <SelectValue placeholder={
                loadingModels 
                  ? 'Loading models...' 
                  : models.length === 0 
                    ? 'No models available' 
                    : 'Select a model'
              } />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.name} value={model.name}>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>{model.display_name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!loadingModels && models.length === 0 && (
            <Alert className="mt-2" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No models are currently available. Please contact support or try again later.
              </AlertDescription>
            </Alert>
          )}
          <p className="text-xs text-muted-foreground">
            This model will be used by default for AI operations. You can change it later.
          </p>
        </div>
      </div>

      <div className="flex space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={testConfiguration}
          disabled={disabled || loading || !config.api_key || !config.default_model_name || models.length === 0}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Test Configuration
            </>
          )}
        </Button>
      </div>

      {/* Information Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                About Gemini Integration
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Gemini AI will be used for intelligent document processing, entity extraction, 
                and conflict resolution in your knowledge graphs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
} 
