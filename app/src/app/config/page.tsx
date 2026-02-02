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

            <TabsContent value="databases" className="flex flex-col gap-6">
              {/* Quick Status Overview */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Staging Status Card */}
                <Card className={cn(
                  "border transition-all",
                  config?.stagingDb?.uri
                    ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "rounded-full p-2",
                        config?.stagingDb?.uri
                          ? "bg-emerald-100 dark:bg-emerald-900/50"
                          : "bg-blue-100 dark:bg-blue-900/50"
                      )}>
                        {config?.stagingDb?.uri ? (
                          <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <HardDrive className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">Staging</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400">
                            Optional
                          </Badge>
                        </div>
                        <p className={cn(
                          "text-xs mt-0.5",
                          config?.stagingDb?.uri
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-blue-700 dark:text-blue-300"
                        )}>
                          {config?.stagingDb?.uri ? "Connected - Data persists across sessions" : "Using in-memory storage"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Production Status Card */}
                <Card className={cn(
                  "border transition-all",
                  config?.prodDb?.uri
                    ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "rounded-full p-2",
                        config?.prodDb?.uri
                          ? "bg-emerald-100 dark:bg-emerald-900/50"
                          : "bg-amber-100 dark:bg-amber-900/50"
                      )}>
                        {config?.prodDb?.uri ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <GitMerge className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">Production</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400">
                            For Merge
                          </Badge>
                        </div>
                        <p className={cn(
                          "text-xs mt-0.5",
                          config?.prodDb?.uri
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-amber-700 dark:text-amber-300"
                        )}>
                          {config?.prodDb?.uri ? "Connected - Ready for merge operations" : "Required to merge staged data"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Info Banner */}
              <Alert className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <Info className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <AlertDescription className="text-slate-700 dark:text-slate-300 text-sm">
                  <strong>How databases work:</strong> The staging database stores your work-in-progress data.
                  When you're ready, you can merge staged data to your production database.
                  Without a staging database, data is stored temporarily in memory.
                </AlertDescription>
              </Alert>

              {/* Database Configuration Forms */}
              <div className="space-y-6">
                {/* Production Database - Show first since it's more important for merge */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <GitMerge className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-sm font-medium text-foreground">Production Database</h3>
                    <span className="text-xs text-muted-foreground">— Required for merge operations</span>
                  </div>
                  <DatabaseConfigForm
                    title="Production Database"
                    description="Your production Neo4j database where staged data gets merged"
                    config={prodDb}
                    onChange={handleProdDbChange}
                    disabled={saving}
                    isExistingConfig={!!config?.prodDb?.uri}
                    isOptional={false}
                    requiredFor="merge"
                    notConfiguredHint="Configure this to merge your staged data into production. Without it, you can still process documents but cannot merge results."
                  />
                </div>

                {/* Staging Database */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <HardDrive className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-medium text-foreground">Staging Database</h3>
                    <span className="text-xs text-muted-foreground">— Optional (uses in-memory if not set)</span>
                  </div>
                  <DatabaseConfigForm
                    title="Staging Database"
                    description="Neo4j database for work-in-progress data before merging to production"
                    config={stagingDb}
                    onChange={handleStagingDbChange}
                    disabled={saving}
                    isExistingConfig={!!config?.stagingDb?.uri}
                    isOptional={true}
                    notConfiguredHint="Not required. Without this, your staging data will be stored in memory and lost when the session ends. Configure for persistent staging."
                  />
                </div>
              </div>

              {/* Database Save Button */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  {!stagingDb.uri && !prodDb.uri
                    ? "Fill in at least one database to save"
                    : stagingDb.uri && prodDb.uri
                      ? "Both databases configured"
                      : stagingDb.uri
                        ? "Only staging configured — you won't be able to merge"
                        : "Only production configured — staging will use in-memory storage"
                  }
                </p>
                <Button
                  onClick={handleSave}
                  disabled={saving || (!stagingDb.uri && !prodDb.uri)}
                  variant="cta"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Database Configuration'
                  )}
                </Button>
              </div>

              {/* Connection Examples - Collapsed by default */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  Neo4j Connection Examples
                </summary>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="font-medium mb-1">Local Development</div>
                    <code className="text-muted-foreground text-xs">neo4j://localhost:7687</code>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="font-medium mb-1">Neo4j Aura Cloud</div>
                    <code className="text-muted-foreground text-xs">neo4j+s://xxx.databases.neo4j.io</code>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="font-medium mb-1">Self-hosted with TLS</div>
                    <code className="text-muted-foreground text-xs">bolt+s://your-server:7687</code>
                  </div>
                </div>
              </details>
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
                  onChange={handleGeminiConfigChange}
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
