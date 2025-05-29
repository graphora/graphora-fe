'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Settings, AlertCircle, Database, RefreshCw } from 'lucide-react'
import { UserConfig } from '@/types/config'

interface ConfigCheckProps {
  children: React.ReactNode
  requireConfig?: boolean
}

export function ConfigCheck({ children, requireConfig = true }: ConfigCheckProps) {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (isLoaded && user) {
      checkConfig()
    }
  }, [isLoaded, user])

  const checkConfig = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/config')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch configuration')
      }

      setConfig(data.config)
    } catch (error) {
      console.error('Error checking config:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to check configuration'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    checkConfig()
  }

  const handleSkipConfig = () => {
    // Allow user to proceed without configuration in development mode
    setConfig({} as UserConfig)
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Checking configuration...</span>
        </div>
      </div>
    )
  }

  if (error) {
    const isBackendError = error.includes('Backend') || error.includes('fetch') || error.includes('connect')
    const isConfigError = error.includes('configuration') || error.includes('CLERK_SECRET_KEY')
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {isBackendError ? 'Backend Connection Error' : 'Configuration Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                {error}
              </AlertDescription>
            </Alert>
            
            {isBackendError && (
              <div className="text-sm text-gray-600">
                <p className="mb-2">This might be because:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>The backend service is not running</li>
                  <li>Environment variables are not configured</li>
                  <li>Network connectivity issues</li>
                </ul>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button onClick={handleRetry} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry ({retryCount})
              </Button>
              
              {isBackendError && process.env.NODE_ENV === 'development' && (
                <Button onClick={handleSkipConfig} variant="secondary" className="flex-1">
                  Skip for now
                </Button>
              )}
            </div>
            
            {!isBackendError && (
              <Button onClick={() => router.push('/config')} className="w-full">
                Go to Configuration
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (requireConfig && !config) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6 text-blue-600" />
              Neo4j Database Configuration Required
            </CardTitle>
            <CardDescription>
              Before you can use Graphora, you need to configure your staging and production Neo4j databases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <Settings className="h-4 w-4" />
              <AlertDescription>
                You'll need to provide connection details for both your staging and production Neo4j databases.
                These databases must have different URIs to ensure proper separation of environments.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <div className="text-sm">
                <h4 className="font-medium mb-1">What you'll need:</h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Neo4j URI (e.g., neo4j://localhost:7687)</li>
                  <li>Database username (usually 'neo4j')</li>
                  <li>Database password</li>
                  <li>Separate URIs for staging and production</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <h5 className="font-medium text-blue-900 mb-1">Neo4j Connection Examples:</h5>
                <div className="text-blue-800 space-y-1">
                  <div><strong>Local:</strong> neo4j://localhost:7687</div>
                  <div><strong>Aura:</strong> neo4j+s://your-instance.databases.neo4j.io</div>
                  <div><strong>Bolt:</strong> bolt://localhost:7687</div>
                </div>
              </div>
              
              <Button 
                onClick={() => router.push('/config')} 
                className="w-full"
              >
                Configure Neo4j Databases
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Configuration exists or not required, render children
  return <>{children}</>
}

export function useConfig() {
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/config')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch configuration')
      }

      setConfig(data.config)
    } catch (error) {
      console.error('Error fetching config:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch configuration')
    } finally {
      setLoading(false)
    }
  }

  return { config, loading, error, refetch: fetchConfig }
} 