import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useAuth'
import { UserConfig } from '@/types/config'
import { UserAIConfigDisplay } from '@/types/ai-config'

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[useSetupCheck]', ...args)
  }
}

export interface SetupStatus {
  isLoading: boolean
  hasDbConfig: boolean
  hasAiConfig: boolean
  isFullyConfigured: boolean
  dbConfig: UserConfig | null
  aiConfig: UserAIConfigDisplay | null
  error: string | null
}

export function useSetupCheck() {
  const { user, isLoaded } = useUser()
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({
    isLoading: true,
    hasDbConfig: false,
    hasAiConfig: false,
    isFullyConfigured: false,
    dbConfig: null,
    aiConfig: null,
    error: null
  })

  useEffect(() => {
    if (isLoaded && user) {
      checkSetupStatus()
    } else if (isLoaded && !user) {
      setSetupStatus(prev => ({ ...prev, isLoading: false }))
    }
  }, [isLoaded, user])

  const checkSetupStatus = async () => {
    try {
      setSetupStatus(prev => ({ ...prev, isLoading: true, error: null }))
      
      // Check database configuration
      const dbResponse = await fetch('/api/config')
      let dbConfig: UserConfig | null = null
      let hasDbConfig = false
      
      if (dbResponse.ok) {
        dbConfig = await dbResponse.json()
        hasDbConfig = !!(dbConfig?.stagingDb?.uri && dbConfig?.prodDb?.uri)
      } else if (dbResponse.status !== 404) {
        throw new Error('Failed to check database configuration')
      }

      // Check AI configuration
      const aiResponse = await fetch('/api/ai-config')
      let aiConfig: UserAIConfigDisplay | null = null
      let hasAiConfig = false
      
      if (aiResponse.ok) {
        aiConfig = await aiResponse.json()
        hasAiConfig = !!(aiConfig?.api_key_masked && aiConfig?.default_model_name)
      } else if (aiResponse.status !== 404) {
        // AI config is optional, so we don't throw an error for 404
        debug('AI configuration not found (optional)')
      }

      const isFullyConfigured = hasDbConfig && hasAiConfig

      setSetupStatus({
        isLoading: false,
        hasDbConfig,
        hasAiConfig,
        isFullyConfigured,
        dbConfig,
        aiConfig,
        error: null
      })
      
    } catch (err) {
      console.error('Error checking setup status:', err)
      setSetupStatus(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to check configuration status'
      }))
    }
  }

  const refreshSetupStatus = () => {
    if (isLoaded && user) {
      checkSetupStatus()
    }
  }

  return { setupStatus, refreshSetupStatus }
} 
