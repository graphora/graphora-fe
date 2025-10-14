import { useState, useCallback, useEffect } from 'react'
import type { GraphData, GraphOperation, GraphState, Node, Edge, NodeType, EdgeType } from '@/types/graph'

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[useGraphState]', ...args)
  }
}

let historyIdCounter = 0
function generateHistoryId(): string {
  return `hist_${Date.now()}_${++historyIdCounter}`
}

// Helper function to generate stable IDs
const generateStableId = (prefix: string) => {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`
}

export function useGraphState(initialData: GraphData) {
  // Load initial state from local storage if available
  const loadInitialState = (): GraphState => {
    if (typeof window === 'undefined') return { data: initialData, history: [], undoStack: [], redoStack: [] }
    
    // If initialData has nodes/edges but no saved state, use it directly
    if (initialData?.nodes?.length > 0 || initialData?.edges?.length > 0) {
      const savedState = localStorage.getItem(`graph_state_${initialData.id}`)
      if (!savedState) {
        debug('Using initial data directly:', initialData)
        return { data: initialData, history: [], undoStack: [], redoStack: [] }
      }
      
      try {
        const parsedState = JSON.parse(savedState)
        // If saved state has no data but initialData does, use initialData
        if (!parsedState.data?.nodes?.length && !parsedState.data?.edges?.length) {
          debug('Saved state empty, using initial data:', initialData)
          return { data: initialData, history: [], undoStack: [], redoStack: [] }
        }
        return parsedState
      } catch (error) {
        console.error('Error loading state from local storage:', error)
        return { data: initialData, history: [], undoStack: [], redoStack: [] }
      }
    }
    
    // No initial data, try loading from localStorage
    const savedState = localStorage.getItem(`graph_state_${initialData.id}`)
    if (savedState) {
      try {
        return JSON.parse(savedState)
      } catch (error) {
        console.error('Error loading state from local storage:', error)
      }
    }
    
    // Default to empty state
    return { data: initialData, history: [], undoStack: [], redoStack: [] }
  }

  const [state, setState] = useState<GraphState>(loadInitialState)
  const { data: graphData, history, undoStack, redoStack } = state

  // Track changes for nodes and edges
  const [changes, setChanges] = useState<{
    nodes: {
      created: Set<string>;
      updated: Set<string>;
      deleted: Set<string>;
    };
    edges: {
      created: Set<string>;
      updated: Set<string>;
      deleted: Set<string>;
    };
  }>({
    nodes: {
      created: new Set(),
      updated: new Set(),
      deleted: new Set()
    },
    edges: {
      created: new Set(),
      updated: new Set(),
      deleted: new Set()
    }
  })

  // Save state to local storage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && initialData.id) {
      localStorage.setItem(`graph_state_${initialData.id}`, JSON.stringify(state))
    }
  }, [state, initialData.id])

  // Helper to update state and save to local storage
  const updateState = (newState: GraphState | ((prev: GraphState) => GraphState)) => {
    setState(typeof newState === 'function' ? newState : () => newState)
  }

  // Client-side only timestamp for history entries
  const [timestamp, setTimestamp] = useState<string>('')
  useEffect(() => {
    setTimestamp(new Date().toISOString())
  }, [])

  const addNode = useCallback((type: NodeType, properties: Record<string, any>) => {
    const node = {
      id: generateStableId('node'),
      type,
      properties,
      label: properties.name || type
    }
    
    const operation: GraphOperation = { type: 'CREATE_NODE', payload: { type, properties, label: properties.name || type } }
    
    // Track created node
    setChanges(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        created: new Set([...prev.nodes.created, node.id])
      }
    }))
    
    updateState({
      ...state,
      data: {
        ...state.data,
        nodes: [...state.data.nodes, node]
      },
      history: [...state.history, {
        id: generateHistoryId(),
        operation,
        timestamp: timestamp || new Date().toISOString(),
        user: 'current-user'
      }],
      undoStack: [...state.undoStack, operation],
      redoStack: []
    })

    return node
  }, [state, timestamp])

  const updateNode = useCallback((nodeId: string, properties: Record<string, any>) => {
    const existingNode = state.data.nodes.find(n => n.id === nodeId)!
    const updatedProperties: Record<string, any> = { ...existingNode.properties }
    
    // Handle each property update
    Object.entries(properties).forEach(([key, value]) => {
      if (value === null) {
        // For null values, remove from local state but keep in API payload
        delete updatedProperties[key]
      } else if (value !== '') {
        // Only update non-empty values
        updatedProperties[key] = value
      }
    })

    const updatedNode = {
      ...existingNode,
      properties: updatedProperties
    }

    // For API, maintain null values
    const apiProperties = { ...properties }

    const operation: GraphOperation = { 
      type: 'UPDATE_NODE', 
      payload: { 
        id: nodeId, 
        properties: apiProperties // Send original properties with null values to API
      } 
    }

    // Track updated node
    setChanges(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        updated: new Set([...prev.nodes.updated, nodeId])
      }
    }))

    updateState({
      ...state,
      data: {
        ...state.data,
        nodes: state.data.nodes.map(n => n.id === nodeId ? updatedNode : n)
      },
      history: [...state.history, {
        id: generateHistoryId(),
        operation,
        timestamp: timestamp || new Date().toISOString(),
        user: 'current-user'
      }],
      undoStack: [...state.undoStack, operation],
      redoStack: []
    })

    return updatedNode
  }, [state, timestamp])

  const deleteNode = useCallback((nodeId: string) => {
    const operation: GraphOperation = { type: 'DELETE_NODE', payload: { id: nodeId } }
    
    // Track deleted node
    setChanges(prev => {
      const newChanges = { ...prev }
      if (newChanges.nodes.created.has(nodeId)) {
        newChanges.nodes.created.delete(nodeId)
      } else {
        newChanges.nodes.deleted.add(nodeId)
      }
      if (newChanges.nodes.updated.has(nodeId)) {
        newChanges.nodes.updated.delete(nodeId)
      }
      return newChanges
    })
    
    updateState({
      ...state,
      data: {
        nodes: state.data.nodes.filter(node => node.id !== nodeId),
        edges: state.data.edges.filter(edge => 
          edge.source !== nodeId && edge.target !== nodeId
        )
      },
      history: [...state.history, {
        id: generateHistoryId(),
        operation,
        timestamp: new Date().toISOString(),
        user: 'current-user'
      }],
      undoStack: [...state.undoStack, operation],
      redoStack: []
    })
  }, [state])

  const addEdge = useCallback((sourceId: string, targetId: string, type: EdgeType, properties: Record<string, any> = {}) => {
    const edge = {
      id: generateStableId('edge'),
      source: sourceId,
      target: targetId,
      type,
      label: type,
      properties
    }
    
    const operation: GraphOperation = { 
      type: 'CREATE_EDGE', 
      payload: { 
        source: sourceId, 
        target: targetId, 
        label: type, 
        properties
      } 
    }
    
    // Track created edge
    setChanges(prev => ({
      ...prev,
      edges: {
        ...prev.edges,
        created: new Set([...prev.edges.created, edge.id])
      }
    }))
    
    updateState({
      ...state,
      data: {
        ...state.data,
        edges: [...state.data.edges, edge]
      },
      history: [...state.history, {
        id: generateHistoryId(),
        operation,
        timestamp: timestamp || new Date().toISOString(),
        user: 'current-user'
      }],
      undoStack: [...state.undoStack, operation],
      redoStack: []
    })

    return edge
  }, [state, timestamp])

  const updateEdge = useCallback((edgeId: string, properties: Record<string, any>) => {
    const existingEdge = state.data.edges.find(e => e.id === edgeId)!
    const updatedProperties: Record<string, any> = { ...existingEdge.properties }
    
    // Handle each property update
    Object.entries(properties).forEach(([key, value]) => {
      if (value === null) {
        // For null values, remove from local state but keep in API payload
        delete updatedProperties[key]
      } else if (value !== '') {
        // Only update non-empty values
        updatedProperties[key] = value
      }
    })

    const updatedEdge = {
      ...existingEdge,
      properties: updatedProperties
    }

    // For API, maintain null values
    const apiProperties = { ...properties }

    const operation: GraphOperation = { 
      type: 'UPDATE_EDGE', 
      payload: { 
        id: edgeId, 
        properties: apiProperties // Send original properties with null values to API
      } 
    }

    // Track updated edge
    setChanges(prev => ({
      ...prev,
      edges: {
        ...prev.edges,
        updated: new Set([...prev.edges.updated, edgeId])
      }
    }))

    updateState({
      ...state,
      data: {
        ...state.data,
        edges: state.data.edges.map(e => e.id === edgeId ? updatedEdge : e)
      },
      history: [...state.history, {
        id: generateHistoryId(),
        operation,
        timestamp: timestamp || new Date().toISOString(),
        user: 'current-user'
      }],
      undoStack: [...state.undoStack, operation],
      redoStack: []
    })

    return updatedEdge
  }, [state, timestamp])

  const deleteEdge = useCallback((edgeId: string) => {
    const operation: GraphOperation = { type: 'DELETE_EDGE', payload: { id: edgeId } }
    
    // Track deleted edge
    setChanges(prev => ({
      ...prev,
      edges: {
        ...prev.edges,
        created: new Set([...prev.edges.created].filter(id => id !== edgeId)),
        updated: new Set([...prev.edges.updated].filter(id => id !== edgeId)),
        deleted: new Set([...prev.edges.deleted, edgeId])
      }
    }))
    
    updateState({
      ...state,
      data: {
        ...state.data,
        edges: state.data.edges.filter(edge => edge.id !== edgeId)
      },
      history: [...state.history, {
        id: generateHistoryId(),
        operation,
        timestamp: timestamp || new Date().toISOString(),
        user: 'current-user'
      }],
      undoStack: [...state.undoStack, operation],
      redoStack: []
    })
  }, [state, timestamp])

  const undo = useCallback(() => {
    updateState((prev: GraphState) => {
      const operation = prev.undoStack[prev.undoStack.length - 1]
      if (!operation) return prev

      // Implement undo logic based on operation type
      const newState = { ...prev }
      newState.undoStack = prev.undoStack.slice(0, -1)
      newState.redoStack = [...prev.redoStack, operation]

      // Reverse the operation
      switch (operation.type) {
        case 'CREATE_NODE':
          newState.data = {
            ...newState.data,
            nodes: newState.data.nodes.slice(0, -1)
          }
          break
        case 'CREATE_EDGE':
          newState.data = {
            ...newState.data,
            edges: newState.data.edges.slice(0, -1)
          }
          break
        case 'DELETE_NODE': {
          const node = prev.data.nodes.find(n => n.id === operation.payload.id)
          if (node) {
            newState.data = {
              ...newState.data,
              nodes: [...newState.data.nodes, node]
            }
          }
          break
        }
        case 'DELETE_EDGE': {
          const deletedEdge = newState.data.edges.find(e => e.id === operation.payload.id)
          if (deletedEdge) {
            newState.data = {
              ...newState.data,
              edges: [...newState.data.edges, deletedEdge]
            }
          }
          break
        }
        case 'UPDATE_NODE': {
          const nodeIndex = newState.data.nodes.findIndex((n: Node) => n.id === operation.payload.id)
          if (nodeIndex !== -1) {
            newState.data = {
              ...newState.data,
              nodes: [
                ...newState.data.nodes.slice(0, nodeIndex),
                { ...newState.data.nodes[nodeIndex], properties: operation.payload.properties || {} },
                ...newState.data.nodes.slice(nodeIndex + 1)
              ]
            }
          }
          break
        }
        case 'UPDATE_EDGE': {
          const edgeIndex = newState.data.edges.findIndex((e: Edge) => e.id === operation.payload.id)
          if (edgeIndex !== -1) {
            const prevEdge = prev.data.edges[edgeIndex]
            newState.data = {
              ...newState.data,
              edges: [
                ...newState.data.edges.slice(0, edgeIndex),
                prevEdge,
                ...newState.data.edges.slice(edgeIndex + 1)
              ]
            }
          }
          break
        }
      }

      return newState
    })
  }, [])

  const redo = useCallback(() => {
    updateState(prev => {
      const operation = prev.redoStack[prev.redoStack.length - 1]
      if (!operation) return prev

      // Implement redo logic based on operation type
      const newState = { ...prev }
      newState.redoStack = prev.redoStack.slice(0, -1)
      newState.undoStack = [...prev.undoStack, operation]

      // Re-apply the operation
      switch (operation.type) {
        case 'CREATE_NODE': {
          const node = {
            id: `${operation.payload.type}_${Date.now()}`,
            type: operation.payload.type,
            label: operation.payload.properties.name || operation.payload.type,
            properties: operation.payload.properties
          }
          newState.data = {
            ...newState.data,
            nodes: [...newState.data.nodes, node]
          }
          break
        }
        case 'CREATE_EDGE': {
          // Get the edge details from the operation payload
          const { source, target, label, properties } = operation.payload
          
          // Check if both source and target nodes exist
          const sourceNode = newState.data.nodes.find((n: Node) => n.id === source)
          const targetNode = newState.data.nodes.find((n: Node) => n.id === target)
          
          if (sourceNode && targetNode) {
            // Check if edge already exists to avoid duplicates
            const edgeExists = newState.data.edges.some((e: Edge) => 
              e.source === source && e.target === target && e.type === label
            )
            
            if (!edgeExists) {
              const edge = {
                id: `${source}_${target}`,
                source,
                target,
                type: label,
                label,
                properties: properties || {}
              }
              
              newState.data = {
                ...newState.data,
                edges: [...newState.data.edges, edge]
              }
            }
          }
          break
        }
        case 'DELETE_NODE':
          newState.data = {
            ...newState.data,
            nodes: newState.data.nodes.filter((n: Node) => n.id !== operation.payload.id),
            edges: newState.data.edges.filter((e: Edge) => 
              e.source !== operation.payload.id && e.target !== operation.payload.id
            )
          }
          break
        case 'DELETE_EDGE':
          // Check if the edge exists before trying to delete it
          if (newState.data.edges.some((e:Edge) => e.id === operation.payload.id)) {
            newState.data = {
              ...newState.data,
              edges: newState.data.edges.filter((e: Edge) => e.id !== operation.payload.id)
            }
          }
          break
        case 'UPDATE_NODE': {
          const nodeIndex = newState.data.nodes.findIndex((n: Node) => n.id === operation.payload.id)
          if (nodeIndex !== -1) {
            newState.data = {
              ...newState.data,
              nodes: [
                ...newState.data.nodes.slice(0, nodeIndex),
                { ...newState.data.nodes[nodeIndex], properties: operation.payload.properties || {} },
                ...newState.data.nodes.slice(nodeIndex + 1)
              ]
            }
          }
          break
        }
        case 'UPDATE_EDGE': {
          const edgeIndex = newState.data.edges.findIndex((e: Edge) => e.id === operation.payload.id)
          if (edgeIndex !== -1) {
            newState.data = {
              ...newState.data,
              edges: [
                ...newState.data.edges.slice(0, edgeIndex),
                { ...newState.data.edges[edgeIndex], properties: operation.payload.properties || {} },
                ...newState.data.edges.slice(edgeIndex + 1)
              ]
            }
          }
          break
        }
      }

      return newState
    })
  }, [])

  const resetGraph = useCallback(async () => {
    try {
      // Fetch fresh data from the API
      const response = await fetch(`/api/graph/${initialData.id}`)
      if (!response.ok) throw new Error('Failed to reset graph')
      const freshData = await response.json()
      
      // Clear local storage
      if (typeof window !== 'undefined' && initialData.id) {
        localStorage.removeItem(`graph_state_${initialData.id}`)
      }
      
      // Reset to initial state with fresh data
      updateState({
        data: {
          ...freshData,
          id: initialData.id,
          _reset: Date.now()
        },
        history: [],
        undoStack: [],
        redoStack: []
      })
    } catch (error) {
      console.error('Error resetting graph:', error)
      throw error
    }
  }, [initialData])

  const saveGraph = useCallback(async () => {
    try {
      // Ensure we're on the client side
      if (typeof window === 'undefined') {
        throw new Error('Cannot save graph on server side')
      }

      // Prepare the changes in the required format
      const payload = {
        nodes: {
          created: state.data.nodes
            .filter(node => changes.nodes.created.has(node.id))
            .map(node => ({
              id: node.id,
              type: node.type,
              label: node.label,
              properties: node.properties
            })),
          updated: state.data.nodes
            .filter(node => changes.nodes.updated.has(node.id))
            .map(node => ({
              id: node.id,
              properties: node.properties
            })),
          deleted: Array.from(changes.nodes.deleted)
        },
        edges: {
          created: state.data.edges
            .filter(edge => changes.edges.created.has(edge.id || ''))
            .map(edge => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              type: edge.type,
              label: edge.label,
              properties: edge.properties
            })),
          updated: state.data.edges
            .filter(edge => changes.edges.updated.has(edge.id || ''))
            .map(edge => ({
              id: edge.id,
              properties: edge.properties
            })),
          deleted: Array.from(changes.edges.deleted)
        },
        version: timestamp || new Date().toISOString()
      }

      const response = await fetch(`/api/graph/${initialData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) throw new Error('Failed to save graph')
      
      const responseData = await response.json()
      const savedData = responseData.data // Extract the data from the response
      
      // Clear local storage and changes after successful save
      if (typeof window !== 'undefined' && initialData.id) {
        localStorage.removeItem(`graph_state_${initialData.id}`)
      }
      
      // Reset changes
      setChanges({
        nodes: {
          created: new Set(),
          updated: new Set(),
          deleted: new Set()
        },
        edges: {
          created: new Set(),
          updated: new Set(),
          deleted: new Set()
        }
      })
      
      // Reset state with saved data
      updateState({
        data: {
          ...savedData,
          id: initialData.id
        },
        history: [],
        undoStack: [],
        redoStack: []
      })
    } catch (error) {
      console.error('Error saving graph:', error)
      throw error
    }
  }, [state, changes, initialData, timestamp])

  return {
    graphData,
    history,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    updateEdge,
    deleteEdge,
    undo,
    redo,
    resetGraph,
    saveGraph
  }
}
