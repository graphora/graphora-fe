'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Loader2, ArrowLeft, HardDrive, Database, Info, AlertTriangle, CheckCircle2, GitMerge } from 'lucide-react'
import { DatabaseConfigForm } from '@/components/config/database-config-form'
import { GeminiConfigForm } from '@/components/config/gemini-config-form'
import { DatabaseConfig, DatabaseConfigInput, UserConfig, ConfigUpsertRequest } from '@/types/config'
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
  const userId = user?.id
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<UserConfig | null>(null)

  // User is in memory storage mode if they haven't configured a staging DB
  // This is a user preference - they can configure DB for persistence or skip for in-memory
  const hasStagingDb = !!(config?.stagingDb?.uri)
  const isUsingMemoryStorage = !hasStagingDb
  const [stagingDb, setStagingDb] = useState<DatabaseConfig>({
    ...defaultDbConfig,
    name: 'neo4j'
  })
  const [prodDb, setProdDb] = useState<DatabaseConfig>({
    ...defaultDbConfig,
    name: 'neo4j'
  })
  const stagingDbDirtyRef = useRef(false)
  const prodDbDirtyRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  
  // AI Configuration state
  const [aiConfig, setAiConfig] = useState<UserAIConfigDisplay | null>(null)
  const [geminiConfig, setGeminiConfig] = useState<GeminiConfigRequest>(defaultGeminiConfig)
  const [savingAI, setSavingAI] = useState(false)
  const aiConfigDirtyRef = useRef(false)

  const returnTo = searchParams.get('returnTo')
  const reason = searchParams.get('reason')
  const tabParam = searchParams.get('tab')
  const isWorkflowRedirect = reason === 'workflow'

  const buildDbPayload = (db: DatabaseConfig): DatabaseConfigInput | null => {
    const trimmedUri = db.uri?.trim()
    const trimmedPassword = db.password?.trim()
    if (!trimmedUri || !trimmedPassword) {
      return null
    }
    return {
      id: db.id,
      ...db,
      name: db.name?.trim() || 'neo4j',
      uri: trimmedUri,
      username: db.username?.trim() || 'neo4j',
      password: trimmedPassword,
    }
  }

  const fetchConfig = useCallback(async () => {
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
        if (!stagingDbDirtyRef.current) {
          setStagingDb({
            ...data.stagingDb,
            password: '' // Don't populate password for security
          })
          stagingDbDirtyRef.current = false
        } else {
          debug('Skipped staging DB reset to preserve unsaved edits')
        }
      }
      if (data.prodDb) {
        if (!prodDbDirtyRef.current) {
          setProdDb({
            ...data.prodDb,
            password: '' // Don't populate password for security
          })
          prodDbDirtyRef.current = false
        } else {
          debug('Skipped production DB reset to preserve unsaved edits')
        }
      }
    } catch (err) {
      console.error('Error fetching config:', err)
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAIConfig = useCallback(async () => {
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
        if (!aiConfigDirtyRef.current) {
          setGeminiConfig({
            api_key: '', // Don't populate API key for security
            default_model_name: data.default_model_name
          })
          aiConfigDirtyRef.current = false
        } else {
          debug('Skipped AI form reset to preserve unsaved edits')
        }
      }
    } catch (err) {
      console.error('Error fetching AI config:', err)
      // Don't set error for AI config as it's optional
    }
  }, [])

  useEffect(() => {
    if (isLoaded && userId) {
      fetchConfig()
      fetchAIConfig()
    }
  }, [isLoaded, userId, fetchConfig, fetchAIConfig])

  const handleStagingDbChange = (updatedConfig: DatabaseConfig) => {
    stagingDbDirtyRef.current = true
    setStagingDb(updatedConfig)
  }

  const handleProdDbChange = (updatedConfig: DatabaseConfig) => {
    prodDbDirtyRef.current = true
    setProdDb(updatedConfig)
  }

  const handleGeminiConfigChange = (updatedConfig: GeminiConfigRequest) => {
    aiConfigDirtyRef.current = true
    setGeminiConfig(updatedConfig)
  }

  const handleSave = async () => {
    if (!user) {
      setError('User not authenticated')
      return
    }

    try {
      setSaving(true)
      setError(null)

      // Determine if this is an update or create operation
      const isUpdate = config !== null
      const stagingPayload = buildDbPayload(stagingDb)
      const prodPayload = buildDbPayload(prodDb)

      // Staging DB is optional (falls back to in-memory)
      // Production DB is required for merge operations but not for initial save
      // User can save with just production DB, just staging DB, or both
      if (!stagingPayload && !prodPayload) {
        toast.info('Enter a database URL and password for at least one database')
        setSaving(false)
        return
      }

      const configRequest: ConfigUpsertRequest = {}
      if (stagingPayload) {
        configRequest.stagingDb = stagingPayload
      }
      if (prodPayload) {
        configRequest.prodDb = prodPayload
      }
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

      const sanitizedSavedConfig: UserConfig = {
        ...savedConfig,
        stagingDb: savedConfig.stagingDb ? { ...savedConfig.stagingDb, password: '' } : null,
        prodDb: savedConfig.prodDb ? { ...savedConfig.prodDb, password: '' } : null,
      }
      setConfig(sanitizedSavedConfig)
      if (savedConfig.stagingDb) {
        setStagingDb({ ...savedConfig.stagingDb, password: '' })
      }
      if (savedConfig.prodDb) {
        setProdDb({ ...savedConfig.prodDb, password: '' })
      }
      stagingDbDirtyRef.current = false
      prodDbDirtyRef.current = false
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
      aiConfigDirtyRef.current = false
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
                <strong>AI Configuration Required:</strong> Configure an AI provider to run workflows.
                Database configuration is optional - without it, data will be stored in memory temporarily.
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
              {/* Database Configuration Forms */}
              <div className="grid gap-4 lg:grid-cols-2">
                <DatabaseConfigForm
                  title="Production Database"
                  description="Where staged data gets merged"
                  config={prodDb}
                  onChange={handleProdDbChange}
                  disabled={saving}
                  isExistingConfig={!!config?.prodDb?.uri}
                  isOptional={false}
                  requiredFor="merge"
                />

                <DatabaseConfigForm
                  title="Staging Database"
                  description="Work-in-progress storage (optional)"
                  config={stagingDb}
                  onChange={handleStagingDbChange}
                  disabled={saving}
                  isExistingConfig={!!config?.stagingDb?.uri}
                  isOptional={true}
                />
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={saving || (!stagingDb.uri && !prodDb.uri)}
                  variant="cta"
                  size="sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Databases'
                  )}
                </Button>
              </div>

              {/* Connection Examples */}
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Connection examples</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <code className="px-2 py-1 rounded bg-muted">neo4j://localhost:7687</code>
                  <code className="px-2 py-1 rounded bg-muted">neo4j+s://xxx.neo4j.io</code>
                  <code className="px-2 py-1 rounded bg-muted">bolt+s://server:7687</code>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai-config" className="flex flex-col gap-4">
              {/* Current Status */}
              {aiConfig && (
                <Card className="shadow-soft">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Current Configuration</span>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <div className="grid gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Provider</span>
                        <span>{aiConfig.provider_display_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">API Key</span>
                        <code className="font-mono">{aiConfig.api_key_masked}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model</span>
                        <span>{aiConfig.default_model_display_name}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Gemini Configuration Form */}
              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">Google Gemini</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">AI provider for document processing</p>
                    </div>
                    <Button
                      onClick={handleSaveAI}
                      disabled={savingAI || !geminiConfig.api_key || !geminiConfig.default_model_name}
                      variant="cta"
                      size="sm"
                    >
                      {savingAI ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        (aiConfig ? 'Update' : 'Save')
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <GeminiConfigForm
                    config={geminiConfig}
                    onChange={handleGeminiConfigChange}
                    disabled={savingAI}
                    isExistingConfig={!!aiConfig}
                  />
                </CardContent>
              </Card>
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
