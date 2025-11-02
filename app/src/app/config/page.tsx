'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Loader2, ArrowLeft } from 'lucide-react'
import { DatabaseConfigForm } from '@/components/config/database-config-form'
import { GeminiConfigForm } from '@/components/config/gemini-config-form'
import { DatabaseConfig, UserConfig, ConfigRequest } from '@/types/config'
import { GeminiConfigRequest, UserAIConfigDisplay } from '@/types/ai-config'
import { toast } from 'sonner'

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[ConfigPage]', ...args)
  }
}

const defaultDbConfig: DatabaseConfig = {
  name: '',
  uri: '',
  username: 'neo4j',
  password: '',
}

const defaultGeminiConfig: GeminiConfigRequest = {
  api_key: '',
  default_model_name: '', // Will be set dynamically when models are loaded
}

function ConfigPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoaded } = useUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [stagingDb, setStagingDb] = useState<DatabaseConfig>({
    ...defaultDbConfig,
    name: 'neo4j'
  })
  const [prodDb, setProdDb] = useState<DatabaseConfig>({
    ...defaultDbConfig,
    name: 'neo4j'
  })
  const [error, setError] = useState<string | null>(null)
  
  // AI Configuration state
  const [aiConfig, setAiConfig] = useState<UserAIConfigDisplay | null>(null)
  const [geminiConfig, setGeminiConfig] = useState<GeminiConfigRequest>(defaultGeminiConfig)
  const [savingAI, setSavingAI] = useState(false)

  const returnTo = searchParams.get('returnTo')
  const reason = searchParams.get('reason')
  const tabParam = searchParams.get('tab')
  const isWorkflowRedirect = reason === 'workflow'

  useEffect(() => {
    if (isLoaded && user) {
      fetchConfig()
      fetchAIConfig()
    }
  }, [isLoaded, user])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      setError(null) // Clear any previous errors
      
      const response = await fetch('/api/config')
      
      if (response.status === 404) {
        // Configuration not found - this is expected for new users
        debug('No configuration found for user, using defaults')
        setConfig(null)
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch configuration: ${response.status}`)
      }

      const data = await response.json()
      debug('Fetched configuration:', data)
      
      setConfig(data)
      if (data.stagingDb) {
        setStagingDb({
          ...data.stagingDb,
          password: '' // Don't populate password for security
        })
      }
      if (data.prodDb) {
        setProdDb({
          ...data.prodDb,
          password: '' // Don't populate password for security
        })
      }
    } catch (err) {
      console.error('Error fetching config:', err)
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const fetchAIConfig = async () => {
    try {
      const response = await fetch('/api/ai-config')
      
      if (response.status === 404) {
        // AI configuration not found - this is expected for new users
        debug('No AI configuration found for user, using defaults')
        setAiConfig(null)
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch AI configuration: ${response.status}`)
      }

      const data = await response.json()
      debug('Fetched AI configuration:', data)
      
      setAiConfig(data)
      if (data) {
        setGeminiConfig({
          api_key: '', // Don't populate API key for security
          default_model_name: data.default_model_name
        })
      }
    } catch (err) {
      console.error('Error fetching AI config:', err)
      // Don't set error for AI config as it's optional
    }
  }

  const handleSave = async () => {
    if (!user) {
      setError('User not authenticated')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const configRequest: ConfigRequest = {
        stagingDb,
        prodDb,
      }

      // Determine if this is an update or create operation
      const isUpdate = config !== null
      const method = isUpdate ? 'PUT' : 'POST'

      debug(`${isUpdate ? 'Updating' : 'Creating'} configuration:`, configRequest)

      const response = await fetch('/api/config', {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configRequest),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const savedConfig = await response.json()
      debug('Configuration saved successfully:', savedConfig)
      
      setConfig(savedConfig)
      toast.success(`Configuration ${isUpdate ? 'updated' : 'created'} successfully`)

      // If there's a return URL, redirect after a short delay
      if (returnTo) {
        setTimeout(() => {
          router.push(decodeURIComponent(returnTo))
        }, 1000)
      }
    } catch (err) {
      console.error('Error saving config:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAI = async () => {
    if (!user) {
      setError('User not authenticated')
      return
    }

    if (!geminiConfig.api_key || !geminiConfig.default_model_name) {
      toast.error('Please fill in both API key and select a model')
      return
    }

    try {
      setSavingAI(true)
      setError(null)

      // Determine if this is an update or create operation
      const isUpdate = aiConfig !== null
      const method = isUpdate ? 'PUT' : 'POST'

      debug(`${isUpdate ? 'Updating' : 'Creating'} AI configuration:`, {
        default_model_name: geminiConfig.default_model_name
      })

      const response = await fetch('/api/ai-config', {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiConfig),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const savedConfig = await response.json()
      debug('AI Configuration saved successfully:', savedConfig)
      
      setAiConfig(savedConfig)
      // Clear the API key field for security
      setGeminiConfig({
        ...geminiConfig,
        api_key: ''
      })
      toast.success(`AI configuration ${isUpdate ? 'updated' : 'created'} successfully`)

      // If there's a return URL and this is a workflow redirect, redirect after a short delay
      if (returnTo && isWorkflowRedirect) {
        setTimeout(() => {
          router.push(decodeURIComponent(returnTo))
        }, 1000)
      }
    } catch (err) {
      console.error('Error saving AI config:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save AI configuration'
      toast.error(errorMessage)
    } finally {
      setSavingAI(false)
    }
  }

  const handleBack = () => {
    if (returnTo) {
      router.push(decodeURIComponent(returnTo))
    } else {
      router.push('/dashboard')
    }
  }

  if (!isLoaded) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">Authentication Required</h2>
            <p className="text-muted-foreground">Please sign in to access configuration.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Configuration"
          description={
            isWorkflowRedirect 
              ? "Set up your databases and AI providers to run workflows and manage your knowledge graphs"
              : "Manage your database connections, AI providers, and system preferences"
          }
          actions={
            returnTo && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )
          }
        />

        <div className="flex-1 overflow-auto">
          <div className="page-shell py-section stack-gap">
          {isWorkflowRedirect && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertDescription className="text-amber-800 dark:text-amber-300">
                <strong>Both Database & AI Configuration Required:</strong> You need to configure both staging & production Neo4j databases and an AI provider before you can run workflows. 
                Once configured, you'll be redirected back to continue your workflow.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="border-destructive/50 bg-destructive/10" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue={tabParam || "databases"} className="mt-8 space-y-5">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="databases">Databases</TabsTrigger>
              <TabsTrigger value="ai-config">AI Config</TabsTrigger>
            </TabsList>

            <TabsContent value="databases" className="flex flex-col gap-5">
              {/* Configuration Status */}
              <Card className="enhanced-card">
                <CardHeader className="enhanced-card-header">
                  <CardTitle className="flex items-center justify-between text-heading-sm">
                    <span className="font-medium">Configuration Status</span>
                    <Badge className={cn(
                      'border border-transparent bg-muted/60 text-foreground/80 dark:text-foreground',
                      config ? 'bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100/60 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                    )}>
                      {config ? 'Configured' : 'Setup Required'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="enhanced-card-content">
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Configure your Neo4j database connections for staging and production environments. 
                      These databases will be used for document processing, knowledge graph storage, and merge operations.
                    </div>
                    
                    {!config && (
                      <Alert>
                        <AlertDescription>
                          You'll need to provide connection details for both your staging and production Neo4j databases.
                          These databases must have different URIs to ensure proper separation of environments.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Database Configuration Forms */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <DatabaseConfigForm
                  title="Staging Database"
                  description="Neo4j database used for testing and development"
                  config={stagingDb}
                  onChange={setStagingDb}
                  disabled={saving}
                  isExistingConfig={!!config?.stagingDb?.uri}
                />

                <DatabaseConfigForm
                  title="Production Database"
                  description="Neo4j database used for live data and production merges"
                  config={prodDb}
                  onChange={setProdDb}
                  disabled={saving}
                  isExistingConfig={!!config?.prodDb?.uri}
                />
              </div>

              {/* Database Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving || !stagingDb.uri || !prodDb.uri}
                  variant="cta"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving Database Configuration...
                    </>
                  ) : (
                    'Save Database Configuration'
                  )}
                </Button>
              </div>

              {/* Connection Examples */}
              <Card className="enhanced-card">
                <CardHeader className="enhanced-card-header">
                  <CardTitle className="text-base">Neo4j Connection Examples</CardTitle>
                </CardHeader>
                <CardContent className="enhanced-card-content">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="font-medium mb-1">Local Development</div>
                      <div className="text-muted-foreground font-mono text-xs">neo4j://localhost:7687</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="font-medium mb-1">Neo4j Aura Cloud</div>
                      <div className="text-muted-foreground font-mono text-xs">neo4j+s://your-instance.databases.neo4j.io</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="font-medium mb-1">Self-hosted with TLS</div>
                      <div className="text-muted-foreground font-mono text-xs">bolt+s://your-server:7687</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-config" className="flex flex-col gap-5">
              {isWorkflowRedirect && (
                <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                  <AlertDescription className="text-amber-800 dark:text-amber-300">
                    <strong>AI Configuration Required:</strong> Configure an AI provider to enable intelligent document processing and entity extraction in workflows. You'll be redirected once setup is complete.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* AI Configuration Status */}
              <Card className="enhanced-card">
                <CardHeader className="enhanced-card-header">
                  <CardTitle className="flex items-center justify-between text-heading-sm">
                    <span className="font-medium">AI Configuration Status</span>
                    <Badge className={cn(
                      'border border-transparent bg-muted/60 text-foreground/80 dark:text-foreground',
                      aiConfig ? 'bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100/60 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                    )}>
                      {aiConfig ? 'Configured' : 'Setup Required'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="enhanced-card-content">
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Configure your AI provider for intelligent document processing, entity extraction, 
                      and conflict resolution. Currently supporting Google Gemini AI Studio.
                    </div>
                    
                    {aiConfig && (
                      <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Current Provider:</span>
                          <span className="text-sm">{aiConfig.provider_display_name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">API Key:</span>
                          <span className="text-sm font-mono">{aiConfig.api_key_masked}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Default Model:</span>
                          <span className="text-sm">{aiConfig.default_model_display_name}</span>
                        </div>
                      </div>
                    )}
                    
                    {!aiConfig && (
                      <Alert>
                        <AlertDescription>
                          Provide a Gemini API key and select a default model to enable AI features. You can manage keys from Google AI Studio.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Gemini Configuration Form */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-heading-sm font-medium text-foreground">Google Gemini AI Studio</h3>
                  <Button
                    onClick={handleSaveAI}
                    disabled={savingAI || !geminiConfig.api_key || !geminiConfig.default_model_name}
                    variant="cta"
                  >
                    {savingAI ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving AI Configuration...
                      </>
                    ) : (
                      (aiConfig ? 'Update AI Configuration' : 'Save AI Configuration')
                    )}
                  </Button>
                </div>
                <GeminiConfigForm
                  config={geminiConfig}
                  onChange={setGeminiConfig}
                  disabled={savingAI}
                  isExistingConfig={!!aiConfig}
                />
              </div>
            </TabsContent>

          </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function ConfigPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfigPageContent />
    </Suspense>
  )
} 
