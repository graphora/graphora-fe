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
  hasDbConfig: boolean           // Effective state (true in memory mode)
  actualHasDbConfig: boolean     // Whether DB is actually configured
  dbConfigOptional: boolean      // Whether DB config is optional (memory mode)
  hasAiConfig: boolean
  isFullyConfigured: boolean
  dbConfig: UserConfig | null
  aiConfig: UserAIConfigDisplay | null
  error: string | null
  isMemoryStorage: boolean
}

export function useSetupCheck() {
  const { user, isLoaded } = useUser()
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({
    isLoading: true,
    hasDbConfig: false,
    actualHasDbConfig: false,
    dbConfigOptional: false,
    hasAiConfig: false,
    isFullyConfigured: false,
    dbConfig: null,
    aiConfig: null,
    error: null,
    isMemoryStorage: false
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

      // First check system info to see if memory storage is enabled
      let isMemoryStorage = false
      try {
        const systemInfoResponse = await fetch('/api/system-info')
        if (systemInfoResponse.ok) {
          const systemInfo = await systemInfoResponse.json()
          isMemoryStorage = systemInfo.storage_type === 'memory'
          debug('System info:', systemInfo)
        }
      } catch (err) {
        debug('Failed to fetch system info, assuming neo4j mode:', err)
      }

      // Check database configuration
      const dbResponse = await fetch('/api/config')
      let dbConfig: UserConfig | null = null
      let actualHasDbConfig = false

      if (dbResponse.ok) {
        dbConfig = await dbResponse.json()
        actualHasDbConfig = !!(dbConfig?.stagingDb?.uri && dbConfig?.prodDb?.uri)
      } else if (dbResponse.status !== 404) {
        throw new Error('Failed to check database configuration')
      }

      // In memory storage mode, DB config is optional
      const dbConfigOptional = isMemoryStorage
      const hasDbConfig = isMemoryStorage ? true : actualHasDbConfig

      if (isMemoryStorage) {
        debug('Memory storage enabled - DB config is optional')
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

      // In memory mode, only AI config is required for "fully configured"
      const isFullyConfigured = isMemoryStorage
        ? hasAiConfig
        : (actualHasDbConfig && hasAiConfig)

      setSetupStatus({
        isLoading: false,
        hasDbConfig,
        actualHasDbConfig,
        dbConfigOptional,
        hasAiConfig,
        isFullyConfigured,
        dbConfig,
        aiConfig,
        error: null,
        isMemoryStorage
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
