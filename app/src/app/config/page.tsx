'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
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

// Dev-stack defaults for the docker-compose setup shipped in graphora-api.
// These match `docker-compose.dev.yml`'s `NEO4J_STAGING_PASSWORD` / `NEO4J_PROD_PASSWORD`
// defaults and the service hostnames Neo4j is reachable on from the API container.
// Any prod deployment will replace these values — they're here so a fresh local
// setup shows a working starting point the user can Save + Test immediately.
const defaultStagingDb: DatabaseConfig = {
  name: 'neo4j',
  uri: 'bolt://neo4j-staging:7687',
  username: 'neo4j',
  password: 'staging_password',
}

const defaultProdDb: DatabaseConfig = {
  name: 'neo4j',
  uri: 'bolt://neo4j-prod:7687',
  username: 'neo4j',
  password: 'prod_password',
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
  const [stagingDb, setStagingDb] = useState<DatabaseConfig>({ ...defaultStagingDb })
  const [prodDb, setProdDb] = useState<DatabaseConfig>({ ...defaultProdDb })
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
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--gx-accent)' }} />
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs">
            <div className="gx-kicker" style={{ marginBottom: 6 }}>Sign-in required</div>
            <h2 style={{ fontSize: 20, fontWeight: 500, color: 'var(--fg)', letterSpacing: '-0.015em', margin: 0, lineHeight: 1.2 }}>
              Authentication required
            </h2>
            <p style={{ color: 'var(--fg-muted)', fontSize: 13, marginTop: 6 }}>
              Please sign in to access configuration.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div style={{ padding: '28px 32px 0' }}>
          <PageHeader
            kicker={isWorkflowRedirect ? 'Setup · workflow prerequisites' : 'System · configuration'}
            title="Configuration"
            description={
              isWorkflowRedirect
                ? 'Set up your databases and AI providers to run workflows and manage your knowledge graphs.'
                : 'Manage database connections, AI providers, and system preferences.'
            }
            actions={
              returnTo && (
                <Button variant="outline" size="sm" onClick={handleBack} className="gap-1.5">
                  <ArrowLeft className="h-[13px] w-[13px]" />
                  Back
                </Button>
              )
            }
          />
        </div>

        <div className="flex-1 overflow-auto">
          <div style={{ padding: '20px 32px 40px', maxWidth: 1600 }}>
          {isWorkflowRedirect && (
            <div
              style={{
                padding: '12px 14px',
                background: 'color-mix(in oklch, var(--warn), transparent 90%)',
                border: '1px solid color-mix(in oklch, var(--warn), transparent 70%)',
                borderRadius: 'var(--r-sm)',
                fontSize: 12.5,
                color: 'var(--fg)',
                marginBottom: 16,
              }}
            >
              <span className="gx-mono" style={{ color: 'var(--warn)', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 10.5 }}>
                AI configuration required
              </span>{' '}
              — Configure an AI provider to run workflows. Database configuration is optional; without it, data is stored in-memory temporarily.
            </div>
          )}

          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue={tabParam || "databases"} className="space-y-5">
            <TabsList>
              <TabsTrigger value="databases">Databases</TabsTrigger>
              <TabsTrigger value="ai-config">AI provider</TabsTrigger>
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
              <div
                style={{
                  padding: 14,
                  background: 'var(--bg-elev)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-sm)',
                }}
              >
                <div className="gx-sep-label" style={{ margin: '0 0 10px' }}>
                  Connection examples
                </div>
                <div className="flex flex-wrap gap-2">
                  {['neo4j://localhost:7687', 'neo4j+s://xxx.neo4j.io', 'bolt+s://server:7687'].map((ex) => (
                    <code
                      key={ex}
                      className="gx-mono"
                      style={{
                        padding: '3px 8px',
                        fontSize: 11,
                        color: 'var(--fg)',
                        background: 'var(--bg-deep)',
                        border: '1px solid var(--line)',
                        borderRadius: 4,
                      }}
                    >
                      {ex}
                    </code>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai-config" className="flex flex-col gap-4">
              {/* Current Status */}
              {aiConfig && (
                <div
                  style={{
                    background: 'var(--bg-elev)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-md)',
                    padding: 16,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="gx-kicker" style={{ marginBottom: 0 }}>
                      Current configuration
                    </div>
                    <span className="gx-badge success">
                      <span className="tick" /> active
                    </span>
                  </div>
                  <div className="gx-mlist">
                    <div className="flex justify-between" style={{ padding: '3px 0' }}>
                      <span className="k">provider   </span>
                      <span className="v" style={{ fontFamily: 'var(--font-sans)' }}>{aiConfig.provider_display_name}</span>
                    </div>
                    <div className="flex justify-between" style={{ padding: '3px 0' }}>
                      <span className="k">api_key    </span>
                      <code className="v">{aiConfig.api_key_masked}</code>
                    </div>
                    <div className="flex justify-between" style={{ padding: '3px 0' }}>
                      <span className="k">model      </span>
                      <span className="v" style={{ fontFamily: 'var(--font-sans)' }}>{aiConfig.default_model_display_name}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Gemini Configuration Form */}
              <div
                style={{
                  background: 'var(--bg-elev)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-md)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--fg)', margin: 0, letterSpacing: '-0.01em' }}>
                        Google Gemini
                      </h3>
                      <p style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 2, lineHeight: 1.45 }}>
                        AI provider for document processing.
                      </p>
                    </div>
                    <Button
                      onClick={handleSaveAI}
                      disabled={savingAI || !geminiConfig.api_key || !geminiConfig.default_model_name}
                      size="sm"
                    >
                      {savingAI ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        aiConfig ? 'Update' : 'Save'
                      )}
                    </Button>
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <GeminiConfigForm
                    config={geminiConfig}
                    onChange={handleGeminiConfigChange}
                    disabled={savingAI}
                    isExistingConfig={!!aiConfig}
                  />
                </div>
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
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" style={{ color: 'var(--gx-accent)' }} />
            <p className="gx-mono" style={{ color: 'var(--fg-muted)', fontSize: 11, letterSpacing: '0.08em' }}>
              LOADING CONFIGURATION…
            </p>
          </div>
        </div>
      </DashboardLayout>
    }>
      <ConfigPageContent />
    </Suspense>
  )
}

