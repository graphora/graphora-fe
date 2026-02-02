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

      // Fetch both database and AI configurations
      const [dbResponse, aiResponse] = await Promise.all([
        fetch('/api/config'),
        fetch('/api/ai-config')
      ])

      let dbConfig = null
      let aiConfig = null
      let hasStagingDb = false

      // Handle database config
      if (dbResponse.status === 404) {
        // No DB configuration - will use in-memory storage
        setConfig(null)
        hasStagingDb = false
      } else if (dbResponse.ok) {
        dbConfig = await dbResponse.json()
        setConfig(dbConfig)
        hasStagingDb = !!(dbConfig?.stagingDb?.uri)
      } else {
        throw new Error(`Failed to fetch database configuration: ${dbResponse.status}`)
      }

      // DB config is optional - if not configured, system uses in-memory storage
      // hasConfig is always true since memory storage is the fallback
      setHasConfig(true)
      setIsMemoryStorage(!hasStagingDb)

      // Handle AI config
      if (aiResponse.ok) {
        aiConfig = await aiResponse.json()
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
      setHasConfig(true) // Still true, memory storage always available
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

    // DB config is optional (falls back to memory storage)
    // hasConfig is always true, so this check always passes
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

    // Only AI config is required for workflows
    // DB config is optional - system uses in-memory storage if not configured
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