import { useState, useEffect } from 'react'
import type { GraphData } from '@/types/graph'

interface UseGraphDataProps {
  transformId?: string
  mergeId?: string
  enabled?: boolean
}

interface UseGraphDataReturn {
  graphData: GraphData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useGraphData({
  transformId,
  mergeId,
  enabled = true
}: UseGraphDataProps): UseGraphDataReturn {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    if (!enabled || (!transformId && !mergeId)) return

    setLoading(true)
    setError(null)

    try {
      // Fetch graph data
      const graphResponse = transformId ? 
        await fetch(`/api/graph/${transformId}`) :
        await fetch(`/api/merge/${mergeId}/conflicts`)

      if (!graphResponse.ok) {
        throw new Error(`Failed to fetch graph data: ${graphResponse.status}`)
      }

      const data = await graphResponse.json()
      setGraphData(data)

      // If we have a mergeId, fetch and merge conflict data
      if (mergeId) {
        const conflictsResponse = await fetch(`/api/merge/${mergeId}/conflicts`)
        if (!conflictsResponse.ok) {
          throw new Error(`Failed to fetch conflicts: ${conflictsResponse.status}`)
        }

        const conflictsData = await conflictsResponse.json()
        
        // Merge conflict information into graph data
        if (data.nodes && conflictsData.conflicts) {
          const updatedNodes = data.nodes.map((node: any) => {
            const nodeConflicts = conflictsData.conflicts.filter(
              (c: any) => c.nodeId === node.id || c.relatedNodes?.includes(node.id)
            )
            return {
              ...node,
              conflicts: nodeConflicts
            }
          })

          setGraphData(prev => ({
            ...prev!,
            nodes: updatedNodes,
            conflicts: conflictsData.conflicts
          }))
        }
      }
    } catch (err) {
      console.error('Error fetching graph data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch graph data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [transformId, mergeId, enabled])

  return {
    graphData,
    loading,
    error,
    refetch: fetchData
  }
} 