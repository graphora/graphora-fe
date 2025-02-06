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
    if (!responseData) return { nodes: [], edges: [] }

    const nodes = responseData.nodes || []
    const edges = responseData.edges || []

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
        id: edge.id || `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        properties: {
          ...edge.properties,
          __status: edge.status,
          confidence: edge.confidence,
          __type: edge.type
        }
      }))
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (!sessionId) {
      setError('No session ID provided')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/merge/${sessionId}/visualization`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setGraphData({ nodes: [], edges: [] })
          return
        }
        throw new Error(`Failed to fetch visualization data: ${response.statusText}`)
      }

      const responseData = await response.json()
      
      if (!responseData || !responseData.data) {
        throw new Error('Invalid response format')
      }

      const currentDataString = JSON.stringify(responseData.data)
      if (currentDataString === prevDataRef.current) {
        return // Data hasn't changed, no need to update
      }

      prevDataRef.current = currentDataString
      setData(responseData)
      setGraphData(transformGraphData(responseData.data))
    } catch (err) {
      console.error('Error fetching visualization data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load visualization')
      setGraphData({ nodes: [], edges: [] })
    } finally {
      setLoading(false)
    }
  }, [sessionId, transformGraphData])

  useEffect(() => {
    if (sessionId) {
      fetchData()
    }
  }, [sessionId, fetchData])

  useEffect(() => {
    if (wsInstance) {
      const handleWsConnected = () => {
        setWsConnected(true)
        fetchData()
      }

      const handleWsDisconnected = () => {
        setWsConnected(false)
      }

      const handleVisualizationUpdate = () => {
        fetchData()
      }

      // Add event listeners
      wsInstance.on('connected', handleWsConnected)
      wsInstance.on('disconnected', handleWsDisconnected)
      wsInstance.on('VISUALIZATION_UPDATE', handleVisualizationUpdate)

      // Check initial connection state
      setWsConnected(wsInstance.isConnected())

      return () => {
        // Only try to remove listeners if wsInstance still exists
        if (wsInstance) {
          try {
            wsInstance.off('connected', handleWsConnected)
            wsInstance.off('disconnected', handleWsDisconnected)
            wsInstance.off('VISUALIZATION_UPDATE', handleVisualizationUpdate)
          } catch (err) {
            console.warn('Error removing WebSocket listeners:', err)
          }
        }
      }
    }
  }, [wsInstance, fetchData])

  const handleNodeOperation = useCallback((operation: GraphOperation) => {
    setGraphData(prevData => {
      switch (operation.type) {
        case 'ADD_NODE':
          return {
            ...prevData,
            nodes: [...prevData.nodes, operation.payload],
          }
        case 'UPDATE_NODE':
          return {
            ...prevData,
            nodes: prevData.nodes.map(node =>
              node.id === operation.payload.id
                ? { ...node, ...operation.payload }
                : node
            ),
          }
        case 'DELETE_NODE':
          return {
            ...prevData,
            nodes: prevData.nodes.filter(node => node.id !== operation.payload.id),
          }
        default:
          return prevData
      }
    })
  }, [])

  const handleEdgeOperation = useCallback((operation: GraphOperation) => {
    setGraphData(prevData => {
      switch (operation.type) {
        case 'ADD_EDGE':
          return {
            ...prevData,
            edges: [...prevData.edges, operation.payload],
          }
        case 'UPDATE_EDGE':
          return {
            ...prevData,
            edges: prevData.edges.map(edge =>
              edge.id === operation.payload.id
                ? { ...edge, ...operation.payload }
                : edge
            ),
          }
        case 'DELETE_EDGE':
          return {
            ...prevData,
            edges: prevData.edges.filter(edge => edge.id !== operation.payload.id),
          }
        default:
          return prevData
      }
    })
  }, [])

  return {
    data,
    loading,
    error,
    wsConnected,
    graphData,
    fetchData,
    addNode: (node: Omit<Node, 'id'>) =>
      handleNodeOperation({ type: 'ADD_NODE', payload: node }),
    updateNode: (nodeId: string, updates: Record<string, any>) =>
      handleNodeOperation({ type: 'UPDATE_NODE', payload: { id: nodeId, ...updates } }),
    deleteNode: (nodeId: string) =>
      handleNodeOperation({ type: 'DELETE_NODE', payload: { id: nodeId } }),
    addEdge: (edge: Omit<Edge, 'id'>) =>
      handleEdgeOperation({ type: 'ADD_EDGE', payload: edge }),
    updateEdge: (edgeId: string, updates: Record<string, any>) =>
      handleEdgeOperation({ type: 'UPDATE_EDGE', payload: { id: edgeId, ...updates } }),
    deleteEdge: (edgeId: string) =>
      handleEdgeOperation({ type: 'DELETE_EDGE', payload: { id: edgeId } }),
  }
}
