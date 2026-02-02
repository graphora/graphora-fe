import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useAuth'
import { UserConfig } from '@/types/config'

export function useUserConfig() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasConfig, setHasConfig] = useState(false)
  const [hasAiConfig, setHasAiConfig] = useState(false)
  const [isMemoryStorage, setIsMemoryStorage] = useState(false)

  useEffect(() => {
    if (isLoaded && user) {
      fetchConfig()
    } else if (isLoaded && !user) {
      setLoading(false)
    }
  }, [isLoaded, user])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      setError(null)

      // First check system info to see if memory storage is enabled
      let memoryMode = false
      try {
        const systemInfoResponse = await fetch('/api/system-info')
        if (systemInfoResponse.ok) {
          const systemInfo = await systemInfoResponse.json()
          memoryMode = systemInfo.storage_type === 'memory'
          setIsMemoryStorage(memoryMode)
        }
      } catch {
        // Default to neo4j mode if we can't fetch system info
      }

      // Fetch both database and AI configurations
      const [dbResponse, aiResponse] = await Promise.all([
        fetch('/api/config'),
        fetch('/api/ai-config')
      ])

      let dbConfig = null
      let aiConfig = null

      // Handle database config
      if (dbResponse.status === 404) {
        // Configuration not found - user needs to set up databases (unless in memory mode)
        setConfig(null)
        setHasConfig(memoryMode) // In memory mode, config is not required
      } else if (dbResponse.ok) {
        dbConfig = await dbResponse.json()
        setConfig(dbConfig)
        setHasConfig(!!(dbConfig.stagingDb?.uri && dbConfig.prodDb?.uri) || memoryMode)
      } else {
        throw new Error(`Failed to fetch database configuration: ${dbResponse.status}`)
      }

      // Handle AI config
      if (aiResponse.ok) {
        aiConfig = await aiResponse.json()
        // Check if user has AI configuration (should be an object with api_key_masked and default_model_name)
        setHasAiConfig(!!(aiConfig?.api_key_masked && aiConfig?.default_model_name))
      } else if (aiResponse.status !== 404) {
        console.warn('Failed to fetch AI configuration:', aiResponse.status)
        setHasAiConfig(false)
      } else {
        setHasAiConfig(false)
      }

    } catch (err) {
      console.error('Error fetching config:', err)
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
      setHasConfig(false)
      setHasAiConfig(false)
    } finally {
      setLoading(false)
    }
  }

  const requireConfig = (onSuccess?: () => void) => {
    if (!isLoaded) {
      return false
    }

    if (!user) {
      router.push('/sign-in')
      return false
    }

    if (loading) {
      return false
    }

    if (!hasConfig) {
      router.push('/config?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search))
      return false
    }

    if (onSuccess) {
      onSuccess()
    }
    
    return true
  }

  const checkConfigBeforeWorkflow = (): { success: boolean; error?: string } => {
    if (!isLoaded || loading) {
      return { success: false, error: 'Configuration check in progress...' }
    }

    if (!user) {
      router.push('/sign-in')
      return { success: false, error: 'User not authenticated' }
    }

    if (!hasConfig && !hasAiConfig) {
      router.push('/config?reason=workflow&returnTo=' + encodeURIComponent(window.location.pathname + window.location.search))
      return { success: false, error: 'Database and AI configuration required to run workflows' }
    }

    if (!hasConfig) {
      router.push('/config?reason=workflow&returnTo=' + encodeURIComponent(window.location.pathname + window.location.search))
      return { success: false, error: 'Database configuration required to run workflows' }
    }

    if (!hasAiConfig) {
      router.push('/config?tab=ai&reason=workflow&returnTo=' + encodeURIComponent(window.location.pathname + window.location.search))
      return { success: false, error: 'AI configuration required to run workflows' }
    }

    return { success: true }
  }

  return {
    config,
    loading,
    error,
    hasConfig,
    hasAiConfig,
    isMemoryStorage,
    requireConfig,
    checkConfigBeforeWorkflow,
    refetch: fetchConfig
  }
} 