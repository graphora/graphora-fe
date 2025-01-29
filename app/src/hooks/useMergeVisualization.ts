import { useState, useEffect } from 'react'
import { MergeVisualizationResponse } from '@/types/merge'

export function useMergeVisualization(sessionId: string) {
  const [data, setData] = useState<MergeVisualizationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/merge/${sessionId}/visualization`)
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }
      const jsonData = await response.json()
      setData(jsonData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch merge visualization'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionId) {
      fetchData()
    }
  }, [sessionId])

  return {
    data,
    loading,
    error,
    refresh: fetchData
  }
}
