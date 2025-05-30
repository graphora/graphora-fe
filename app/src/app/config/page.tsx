'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, Settings, AlertCircle, CheckCircle, Database, User, Bell, Shield, ArrowLeft } from 'lucide-react'
import { DatabaseConfigForm } from '@/components/config/database-config-form'
import { DatabaseConfig, UserConfig, ConfigRequest } from '@/types/config'
import { toast } from 'sonner'

const defaultDbConfig: DatabaseConfig = {
  name: '',
  uri: '',
  username: 'neo4j',
  password: '',
}

export default function ConfigPage() {
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

  const returnTo = searchParams.get('returnTo')
  const reason = searchParams.get('reason')
  const isWorkflowRedirect = reason === 'workflow'

  useEffect(() => {
    if (isLoaded && user) {
      fetchConfig()
    }
  }, [isLoaded, user])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      setError(null) // Clear any previous errors
      
      const response = await fetch('/api/config')
      
      if (response.status === 404) {
        // Configuration not found - this is expected for new users
        console.log('No configuration found for user, using defaults')
        setConfig(null)
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch configuration: ${response.status}`)
      }

      const data = await response.json()
      console.log('Fetched configuration:', data)
      
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

  const handleSave = async () => {
    if (!user) {
      setError('User not authenticated')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const configRequest: ConfigRequest = {
        userId: user.id,
        stagingDatabase: stagingDb,
        productionDatabase: prodDb,
      }

      console.log('Saving configuration:', configRequest)

      const response = await fetch('/api/config', {
        method: 'POST',
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
      console.log('Configuration saved successfully:', savedConfig)
      
      setConfig(savedConfig)
      toast.success('Configuration saved successfully')

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
          title="Database Configuration"
          description={
            isWorkflowRedirect 
              ? "Set up your Neo4j databases to run workflows and manage your knowledge graphs"
              : "Manage your database connections and system preferences"
          }
          icon={<Settings className="h-6 w-6" />}
          actions={
            <div className="flex items-center space-x-3">
              {returnTo && (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <Button 
                onClick={handleSave} 
                disabled={saving || !stagingDb.uri || !prodDb.uri}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>
            </div>
          }
        />

        <div className="flex-1 overflow-auto p-6">
          {isWorkflowRedirect && (
            <Alert className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-300">
                <strong>Database Configuration Required:</strong> You need to configure both staging and production Neo4j databases before you can run workflows. 
                Once configured, you'll be redirected back to continue your workflow.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-6" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="databases" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-muted">
              <TabsTrigger value="databases" className="data-[state=active]:bg-background">
                <Database className="h-4 w-4 mr-2" />
                Databases
              </TabsTrigger>
              <TabsTrigger value="profile" disabled>
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" disabled>
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security" disabled>
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="databases" className="space-y-6">
              {/* Configuration Status */}
              <Card className="enhanced-card">
                <CardHeader className="enhanced-card-header">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <Database className="h-5 w-5 text-primary" />
                      <span>Configuration Status</span>
                    </span>
                    {config ? (
                      <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Setup Required
                      </Badge>
                    )}
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
                        <Settings className="h-4 w-4" />
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="enhanced-card">
                  <CardHeader className="enhanced-card-header">
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="h-5 w-5 text-primary" />
                      <span>Staging Database</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="enhanced-card-content">
                    <DatabaseConfigForm
                      title="Staging Database"
                      description="Neo4j database used for testing and development"
                      config={stagingDb}
                      onChange={setStagingDb}
                      disabled={saving}
                      isExistingConfig={!!config?.stagingDb?.uri}
                    />
                  </CardContent>
                </Card>

                <Card className="enhanced-card">
                  <CardHeader className="enhanced-card-header">
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <span>Production Database</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="enhanced-card-content">
                    <DatabaseConfigForm
                      title="Production Database"
                      description="Neo4j database used for live data and production merges"
                      config={prodDb}
                      onChange={setProdDb}
                      disabled={saving}
                      isExistingConfig={!!config?.prodDb?.uri}
                    />
                  </CardContent>
                </Card>
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

            {/* Placeholder tabs for future features */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="enhanced-card">
                <CardContent className="enhanced-card-content p-6">
                  <div className="text-center text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Profile settings will be available in a future update.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card className="enhanced-card">
                <CardContent className="enhanced-card-content p-6">
                  <div className="text-center text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Notification preferences will be available in a future update.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card className="enhanced-card">
                <CardContent className="enhanced-card-content p-6">
                  <div className="text-center text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Security settings will be available in a future update.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
} 