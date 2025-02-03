import { useState, useEffect, useCallback, useRef } from 'react'
import { MergeVisualizationResponse } from '@/types/merge'
import type { GraphData, GraphOperation, Node, Edge } from '@/types/graph'
import { MergeWebSocket } from '@/lib/merge-websocket'

export function useMergeVisualization(sessionId: string, wsInstance: MergeWebSocket | null) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [data, setData] = useState<MergeVisualizationResponse | null>(null)
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] })
  const prevDataRef = useRef<string>('')

  const transformGraphData = useCallback((responseData: any): GraphData => {
    console.log('Raw response data:', responseData)
    if (!responseData) return { nodes: [], edges: [] }

    // Extract nodes and edges from the correct level
    const nodes = responseData.nodes || []
    const edges = responseData.edges || []
    
    console.log('Processing nodes:', nodes.length, 'edges:', edges.length)

    return {
      nodes: nodes.map((node: any) => ({
        id: node.id,
        labels: node.labels || [],
        properties: {
          ...node.properties,
          __status: node.status,
          __type: node.type,
          __conflicts: node.conflicts || []
        }
      })),
      edges: edges.map((edge: any) => ({
        id: `${edge.source}-${edge.target}`,
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

  useEffect(() => {
    if (data) {
      console.log('Data from hook:', data)
      const newGraphData = transformGraphData(data)
      console.log('Transformed graph data:', newGraphData)
      const newDataStr = JSON.stringify(newGraphData)
      if (newDataStr !== prevDataRef.current) {
        setGraphData(newGraphData)
        prevDataRef.current = newDataStr
      }
    }
  }, [data, transformGraphData])

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
      
      setLoading(false)
      return responseData
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch data')
      setLoading(false)
      return null
    }
  }, [sessionId])

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
      const isConnected = wsInstance.isConnected()
      setWsConnected(isConnected)
      if (isConnected) {
        // Fetch initial data when WebSocket connects
        fetchData()
      }
    } else {
      setWsConnected(false)
    }
  }, [wsInstance, fetchData])

  // Initial data fetch
  useEffect(() => {
    if (sessionId) {
      fetchData()
    }
  }, [sessionId, fetchData])

  return {
    data,
    loading,
    error,
    wsConnected,
    graphData,
    fetchData,
    addNode: (node: Omit<Node, 'id'>) => handleNodeOperation({ type: 'CREATE_NODE', payload: node }),
    updateNode: (nodeId: string, updates: Record<string, any>) => handleNodeOperation({ type: 'UPDATE_NODE', payload: { id: nodeId, properties: updates } }),
    deleteNode: (nodeId: string) => handleNodeOperation({ type: 'DELETE_NODE', payload: { id: nodeId } }),
    addEdge: (edge: Omit<Edge, 'id'>) => handleEdgeOperation({ type: 'CREATE_EDGE', payload: edge }),
    updateEdge: (edgeId: string, updates: Record<string, any>) => handleEdgeOperation({ type: 'UPDATE_EDGE', payload: { id: edgeId, properties: updates } }),
    deleteEdge: (edgeId: string) => handleEdgeOperation({ type: 'DELETE_EDGE', payload: { id: edgeId } })
  }
}
