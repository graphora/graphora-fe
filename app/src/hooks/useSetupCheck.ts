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
  hasStagingDb: boolean          // Whether staging DB is configured (optional)
  hasProdDb: boolean             // Whether prod DB is configured (required for merge)
  hasAiConfig: boolean
  isFullyConfigured: boolean     // Has AI config (minimum for workflows)
  canMerge: boolean              // Has prod DB + AI config (required for merge)
  dbConfig: UserConfig | null
  aiConfig: UserAIConfigDisplay | null
  error: string | null
  isMemoryStorage: boolean       // Using in-memory for staging (no staging DB)
  // Legacy compatibility
  hasDbConfig: boolean
  actualHasDbConfig: boolean
  dbConfigOptional: boolean
}

export function useSetupCheck() {
  const { user, isLoaded } = useUser()
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({
    isLoading: true,
    hasStagingDb: false,
    hasProdDb: false,
    hasAiConfig: false,
    isFullyConfigured: false,
    canMerge: false,
    dbConfig: null,
    aiConfig: null,
    error: null,
    isMemoryStorage: true,
    // Legacy compatibility
    hasDbConfig: true,
    actualHasDbConfig: false,
    dbConfigOptional: true
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
      let hasStagingDb = false
      let hasProdDb = false

      if (dbResponse.ok) {
        dbConfig = await dbResponse.json()
        hasStagingDb = !!(dbConfig?.stagingDb?.uri)
        hasProdDb = !!(dbConfig?.prodDb?.uri)
      } else if (dbResponse.status !== 404) {
        throw new Error('Failed to check database configuration')
      }

      // Staging DB is optional - uses in-memory if not configured
      // Prod DB is required for merge operations
      const isMemoryStorage = !hasStagingDb

      debug('Storage mode:', isMemoryStorage ? 'in-memory (no staging DB)' : 'persistent (staging DB configured)')
      debug('Prod DB configured:', hasProdDb)

      // Check AI configuration
      const aiResponse = await fetch('/api/ai-config')
      let aiConfig: UserAIConfigDisplay | null = null
      let hasAiConfig = false

      if (aiResponse.ok) {
        aiConfig = await aiResponse.json()
        hasAiConfig = !!(aiConfig?.api_key_masked && aiConfig?.default_model_name)
      } else if (aiResponse.status !== 404) {
        debug('AI configuration not found (optional)')
      }

      // Fully configured for workflows = has AI config (staging DB is optional)
      // Can merge = has prod DB + AI config
      const isFullyConfigured = hasAiConfig
      const canMerge = hasProdDb && hasAiConfig

      setSetupStatus({
        isLoading: false,
        hasStagingDb,
        hasProdDb,
        hasAiConfig,
        isFullyConfigured,
        canMerge,
        dbConfig,
        aiConfig,
        error: null,
        isMemoryStorage,
        // Legacy compatibility
        hasDbConfig: true,
        actualHasDbConfig: hasStagingDb,
        dbConfigOptional: true
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
