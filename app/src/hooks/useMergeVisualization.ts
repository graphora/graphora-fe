import { useState, useEffect, useCallback } from 'react'
import { MergeVisualizationResponse } from '@/types/merge'
import { useGraphState } from '@/hooks/useGraphState'
import type { GraphData, GraphOperation } from '@/types/graph'
import { MergeWebSocket } from '@/lib/merge-websocket'

export function useMergeVisualization(sessionId: string, wsInstance: MergeWebSocket | null) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [data, setData] = useState<MergeVisualizationResponse | null>(null)
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] })

  const transformGraphData = useCallback((data: any): GraphData => {
    if (!data || !data.nodes) return { nodes: [], edges: [] }

    return {
      nodes: data.nodes.map((node: any) => ({
        id: node.id,
        labels: node.labels || [],
        properties: {
          ...node.properties,
          __status: node.status,
          __conflicts: node.conflicts,
          __type: node.type,
          __modified: node.status === 'both' && Object.keys(node.properties || {}).some(key => 
            typeof node.properties[key] === 'object' && 
            node.properties[key]?.hasOwnProperty('staging') && 
            node.properties[key]?.hasOwnProperty('prod')
          )
        }
      })),
      edges: data.edges.map((edge: any) => ({
        id: edge.source + '-' + edge.target,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        properties: {
          confidence: edge.confidence,
          __type: edge.type
        }
      }))
    }
  }, [])

  // Fetch data from the API
  const fetchData = useCallback(async () => {
    if (!sessionId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/merge/${sessionId}/visualization`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const responseData: MergeVisualizationResponse = await response.json()
      setData(responseData)
      
      // Transform and update graph data
      const transformedData = transformGraphData(responseData.graph)
      setGraphData(transformedData)
      
      setLoading(false)
      return responseData
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch data')
      setLoading(false)
      return null
    }
  }, [sessionId, transformGraphData])

  const handleNodeOperation = useCallback(async (operation: GraphOperation) => {
    try {
      const response = await fetch(`/api/merge/${sessionId}/node`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operation),
      })

      if (!response.ok) {
        throw new Error(`Failed to apply node operation: ${response.statusText}`)
      }

      // Refresh data after operation
      await fetchData()
    } catch (error) {
      console.error('Error applying node operation:', error)
      throw error
    }
  }, [sessionId, fetchData])

  const handleEdgeOperation = useCallback(async (operation: GraphOperation) => {
    try {
      const response = await fetch(`/api/merge/${sessionId}/edge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operation),
      })

      if (!response.ok) {
        throw new Error(`Failed to apply edge operation: ${response.statusText}`)
      }

      // Refresh data after operation
      await fetchData()
    } catch (error) {
      console.error('Error applying edge operation:', error)
      throw error
    }
  }, [sessionId, fetchData])

  // Update connection status when websocket instance changes
  useEffect(() => {
    if (wsInstance) {
      setWsConnected(wsInstance.isConnected())
    } else {
      setWsConnected(false)
    }
  }, [wsInstance])

  return {
    data,
    loading,
    error,
    wsConnected,
    graphData,
    fetchData,
    addNode: (node: any) => handleNodeOperation({ type: 'ADD_NODE', node }),
    updateNode: (nodeId: string, updates: any) => handleNodeOperation({ type: 'UPDATE_NODE', nodeId, updates }),
    deleteNode: (nodeId: string) => handleNodeOperation({ type: 'DELETE_NODE', nodeId }),
    addEdge: (edge: any) => handleEdgeOperation({ type: 'ADD_EDGE', edge }),
    updateEdge: (edgeId: string, updates: any) => handleEdgeOperation({ type: 'UPDATE_EDGE', edgeId, updates }),
    deleteEdge: (edgeId: string) => handleEdgeOperation({ type: 'DELETE_EDGE', edgeId })
  }
}
