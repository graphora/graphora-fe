import { useState, useEffect } from 'react'

export interface SystemInfo {
  storage_type: 'memory' | 'neo4j'
  auth_bypass_enabled: boolean
  version: string
}

interface UseSystemInfoResult {
  systemInfo: SystemInfo | null
  isLoading: boolean
  error: string | null
  isMemoryStorage: boolean
}

export function useSystemInfo(): UseSystemInfoResult {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/system-info')

        if (!response.ok) {
          throw new Error(`Failed to fetch system info: ${response.status}`)
        }

        const data = await response.json()
        setSystemInfo(data)
      } catch (err) {
        console.error('Error fetching system info:', err)
        setError(err instanceof Error ? err.message : 'Failed to load system info')
        // Default to neo4j mode if we can't fetch system info
        setSystemInfo({
          storage_type: 'neo4j',
          auth_bypass_enabled: false,
          version: 'unknown'
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSystemInfo()
  }, [])

  return {
    systemInfo,
    isLoading,
    error,
    isMemoryStorage: systemInfo?.storage_type === 'memory'
  }
}
