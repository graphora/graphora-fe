import { useState, useEffect, useCallback, useRef } from 'react'
import { MergeVisualizationResponse } from '@/types/merge'
import type { GraphData, GraphOperation, Node, Edge } from '@/types/graph'

export function useMergeVisualization(mergeId: string, transformId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    if (!mergeId || !transformId) {
      setError('No merge ID or transform ID provided')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/merge/merges/${mergeId}/graph/${transformId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setGraphData({ nodes: [], edges: [] })
          return
        }
        throw new Error(`Failed to fetch visualization data: ${response.statusText}`)
      }

      const responseData = await response.json()
      
      if (!responseData) {
        throw new Error('Invalid response format')
      }

      const currentDataString = JSON.stringify(responseData)
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
  }, [mergeId, transformId, transformGraphData])

  useEffect(() => {
    if (mergeId && transformId) {
      fetchData()
    }
  }, [mergeId, transformId, fetchData])

  const handleNodeOperation = useCallback((operation: GraphOperation) => {
    setGraphData(prevData => {
      switch (operation.type) {
        case 'CREATE_NODE':
          return {
            ...prevData,
            nodes: [...prevData.nodes, { ...operation.payload, id: crypto.randomUUID() }],
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
        case 'CREATE_EDGE':
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
    graphData,
    fetchData,
    createNode: (node: Omit<Node, 'id'>) =>
      handleNodeOperation({ type: 'CREATE_NODE', payload: node }),
    updateNode: (nodeId: string, updates: Record<string, any>) =>
      handleNodeOperation({ type: 'UPDATE_NODE', payload: { id: nodeId, ...updates } }),
    deleteNode: (nodeId: string) =>
      handleNodeOperation({ type: 'DELETE_NODE', payload: { id: nodeId } }),
    createEdge: (edge: Omit<Edge, 'id'>) =>
      handleEdgeOperation({ type: 'CREATE_EDGE', payload: edge }),
    updateEdge: (edgeId: string, updates: Record<string, any>) =>
      handleEdgeOperation({ type: 'UPDATE_EDGE', payload: { id: edgeId, ...updates } }),
    deleteEdge: (edgeId: string) =>
      handleEdgeOperation({ type: 'DELETE_EDGE', payload: { id: edgeId } }),
  }
}
