'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Settings, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
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
    name: 'Staging Neo4j'
  })
  const [prodDb, setProdDb] = useState<DatabaseConfig>({
    ...defaultDbConfig,
    name: 'Production Neo4j'
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
        // Don't show an error, just continue with empty config
        setConfig(null)
        return
      }
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch configuration')
      }

      const data = await response.json()
      if (data) {
        setConfig(data)
        setStagingDb(data.stagingDb)
        setProdDb(data.prodDb)
      }
    } catch (error) {
      console.error('Error fetching config:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch configuration')
    } finally {
      setLoading(false)
    }
  }

  const validateConfig = (): string | null => {
    // Validate staging DB
    if (!stagingDb.name || !stagingDb.uri || !stagingDb.username || !stagingDb.password) {
      return 'Please fill in all required fields for the staging database'
    }

    // Validate prod DB
    if (!prodDb.name || !prodDb.uri || !prodDb.username || !prodDb.password) {
      return 'Please fill in all required fields for the production database'
    }

    // Validate URI formats
    const validUriPrefixes = ['neo4j://', 'bolt://', 'neo4j+s://', 'bolt+s://']
    if (!validUriPrefixes.some(prefix => stagingDb.uri.startsWith(prefix))) {
      return 'Staging database URI must start with neo4j://, bolt://, neo4j+s://, or bolt+s://'
    }
    if (!validUriPrefixes.some(prefix => prodDb.uri.startsWith(prefix))) {
      return 'Production database URI must start with neo4j://, bolt://, neo4j+s://, or bolt+s://'
    }

    // Validate that staging and prod are different
    if (stagingDb.uri === prodDb.uri) {
      return 'Staging and production database URIs must be different'
    }

    return null
  }

  const saveConfig = async () => {
    const validationError = validateConfig()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setSaving(true)
      setError(null)

      const configData: ConfigRequest = {
        stagingDb,
        prodDb,
      }

      const method = config ? 'PUT' : 'POST'
      const response = await fetch('/api/config', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration')
      }

      setConfig(data)
      toast.success('Configuration saved successfully!')
      
      // Redirect to home page after successful save
      setTimeout(() => {
        router.push('/')
      }, 1000)
    } catch (error) {
      console.error('Error saving config:', error)
      setError(error instanceof Error ? error.message : 'Failed to save configuration')
      toast.error('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading configuration...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Neo4j Database Configuration</h1>
          </div>
          <p className="text-gray-600">
            Configure your staging and production Neo4j databases to get started with Graphora.
            Both databases are required and must have different URIs.
          </p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {config && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Configuration found. You can update your database settings below.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <DatabaseConfigForm
            title="Staging Database"
            description="Neo4j database used for testing and development"
            config={stagingDb}
            onChange={setStagingDb}
            disabled={saving}
          />

          <DatabaseConfigForm
            title="Production Database"
            description="Neo4j database used for live data and production merges"
            config={prodDb}
            onChange={setProdDb}
            disabled={saving}
          />
        </div>

        <div className="bg-white rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-3">Neo4j Connection Examples</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div>
              <strong>Local Neo4j:</strong> <code className="bg-gray-100 px-2 py-1 rounded">neo4j://localhost:7687</code>
            </div>
            <div>
              <strong>Neo4j Aura:</strong> <code className="bg-gray-100 px-2 py-1 rounded">neo4j+s://your-instance.databases.neo4j.io</code>
            </div>
            <div>
              <strong>Bolt Protocol:</strong> <code className="bg-gray-100 px-2 py-1 rounded">bolt://localhost:7687</code>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={saveConfig}
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
} 