'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, Settings, AlertCircle, CheckCircle, Database, User, Bell, Shield } from 'lucide-react'
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
    } catch (err) {
      console.error('Error saving config:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSaving(false)
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
            <h2 className="text-lg font-semibold">Authentication Required</h2>
            <p className="text-gray-600">Please sign in to access configuration.</p>
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
          description="Manage your system settings and database connections"
          icon={<Settings className="h-6 w-6" />}
          actions={
            <div className="flex items-center space-x-3">
              {config && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-slate-600">Loading configuration...</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="databases" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="databases">
                    <Database className="h-4 w-4 mr-2" />
                    Databases
                  </TabsTrigger>
                  <TabsTrigger value="profile">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="notifications">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger value="security">
                    <Shield className="h-4 w-4 mr-2" />
                    Security
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="databases" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="enhanced-card">
                      <CardHeader className="enhanced-card-header">
                        <CardTitle className="flex items-center space-x-2">
                          <Database className="h-5 w-5 text-blue-600" />
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
                          <Database className="h-5 w-5 text-emerald-600" />
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
                </TabsContent>

                <TabsContent value="profile" className="space-y-6">
                  <Card className="enhanced-card">
                    <CardHeader className="enhanced-card-header">
                      <CardTitle>User Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="enhanced-card-content space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Email</label>
                          <input 
                            className="form-input" 
                            value={user?.emailAddresses[0]?.emailAddress || ''} 
                            disabled 
                          />
                        </div>
                        <div>
                          <label className="form-label">User ID</label>
                          <input 
                            className="form-input" 
                            value={user?.id || ''} 
                            disabled 
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6">
                  <Card className="enhanced-card">
                    <CardHeader className="enhanced-card-header">
                      <CardTitle>Notification Preferences</CardTitle>
                    </CardHeader>
                    <CardContent className="enhanced-card-content">
                      <div className="text-center py-8 text-slate-500">
                        <Bell className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                        <p>Notification settings coming soon</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                  <Card className="enhanced-card">
                    <CardHeader className="enhanced-card-header">
                      <CardTitle>Security Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="enhanced-card-content">
                      <div className="text-center py-8 text-slate-500">
                        <Shield className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                        <p>Security settings coming soon</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 