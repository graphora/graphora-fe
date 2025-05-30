import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { UserConfig } from '@/types/config'

export function useUserConfig() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasConfig, setHasConfig] = useState(false)

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
      
      const response = await fetch('/api/config')
      
      if (response.status === 404) {
        // Configuration not found - user needs to set up databases
        setConfig(null)
        setHasConfig(false)
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch configuration: ${response.status}`)
      }

      const data = await response.json()
      setConfig(data)
      setHasConfig(!!(data.stagingDb?.uri && data.prodDb?.uri))
      
    } catch (err) {
      console.error('Error fetching config:', err)
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
      setHasConfig(false)
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

  const checkConfigBeforeWorkflow = (): boolean => {
    if (!isLoaded || loading) {
      return false
    }

    if (!user) {
      router.push('/sign-in')
      return false
    }

    if (!hasConfig) {
      router.push('/config?reason=workflow&returnTo=' + encodeURIComponent(window.location.pathname + window.location.search))
      return false
    }

    return true
  }

  return {
    config,
    loading,
    error,
    hasConfig,
    requireConfig,
    checkConfigBeforeWorkflow,
    refetch: fetchConfig
  }
} 