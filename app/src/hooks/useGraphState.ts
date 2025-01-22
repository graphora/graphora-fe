import { useState, useCallback, useEffect } from 'react'
import type { GraphData, GraphOperation, GraphState, Node, Edge, NodeType, EdgeType } from '@/types/graph'

let historyIdCounter = 0
function generateHistoryId(): string {
  return `hist_${Date.now()}_${++historyIdCounter}`
}

export function useGraphState(initialData: GraphData) {
  // Load initial state from local storage if available
  const loadInitialState = (): GraphState => {
    if (typeof window === 'undefined') return { data: initialData, history: [], undoStack: [], redoStack: [] }
    
    const savedState = localStorage.getItem(`graph_state_${initialData.id}`)
    if (savedState) {
      try {
        return JSON.parse(savedState)
      } catch (error) {
        console.error('Error loading state from local storage:', error)
      }
    }
    return { data: initialData, history: [], undoStack: [], redoStack: [] }
  }

  const [state, setState] = useState<GraphState>(loadInitialState)
  const { data: graphData, history, undoStack, redoStack } = state

  // Save state to local storage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && initialData.id) {
      localStorage.setItem(`graph_state_${initialData.id}`, JSON.stringify(state))
    }
  }, [state, initialData.id])

  // Helper to update state and save to local storage
  const updateState = (newState: GraphState) => {
    setState(newState)
  }

  const addNode = useCallback((type: NodeType, properties: Record<string, any>) => {
    const node = {
      id: `node_${Date.now()}`,
      type,
      properties,
      label: properties.name || type
    }
    
    const operation: GraphOperation = { type: 'CREATE_NODE', payload: { type, properties } }
    
    updateState({
      ...state,
      data: {
        ...state.data,
        nodes: [...state.data.nodes, node]
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

    return node
  }, [state])

  const updateNode = useCallback((nodeId: string, properties: Record<string, any>) => {
    const updatedNode = {
      ...state.data.nodes.find(n => n.id === nodeId)!,
      properties: { ...properties }
    }
    
    const operation: GraphOperation = { type: 'UPDATE_NODE', payload: { id: nodeId, properties } }
    
    updateState({
      ...state,
      data: {
        ...state.data,
        nodes: state.data.nodes.map(node => 
          node.id === nodeId ? updatedNode : node
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

    return updatedNode
  }, [state])

  const deleteNode = useCallback((nodeId: string) => {
    const operation: GraphOperation = { type: 'DELETE_NODE', payload: { id: nodeId } }
    
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
      id: `${sourceId}_${targetId}_${Date.now()}`,
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
    
    updateState({
      ...state,
      data: {
        ...state.data,
        edges: [...state.data.edges, edge]
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

    return edge
  }, [state])

  const updateEdge = useCallback((edgeId: string, properties: Record<string, any>) => {
    const updatedEdge = {
      ...state.data.edges.find(e => e.id === edgeId)!,
      properties: { ...properties }
    }
    
    const operation: GraphOperation = { type: 'UPDATE_EDGE', payload: { id: edgeId, properties } }
    
    updateState({
      ...state,
      data: {
        ...state.data,
        edges: state.data.edges.map(edge => 
          edge.id === edgeId ? updatedEdge : edge
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

    return updatedEdge
  }, [state])

  const deleteEdge = useCallback((edgeId: string) => {
    const operation: GraphOperation = { type: 'DELETE_EDGE', payload: { id: edgeId } }
    
    updateState({
      ...state,
      data: {
        ...state.data,
        edges: state.data.edges.filter(edge => edge.id !== edgeId)
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

  const undo = useCallback(() => {
    updateState(prev => {
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
          const deletedEdge = operation.payload.edge
          if (deletedEdge) {
            newState.data = {
              ...newState.data,
              edges: [...newState.data.edges, deletedEdge]
            }
          }
          break
        }
        case 'UPDATE_NODE': {
          const nodeIndex = newState.data.nodes.findIndex(n => n.id === operation.payload.id)
          if (nodeIndex !== -1) {
            const prevNode = prev.data.nodes[nodeIndex]
            newState.data = {
              ...newState.data,
              nodes: [
                ...newState.data.nodes.slice(0, nodeIndex),
                prevNode,
                ...newState.data.nodes.slice(nodeIndex + 1)
              ]
            }
          }
          break
        }
        case 'UPDATE_EDGE': {
          const edgeIndex = newState.data.edges.findIndex(e => e.id === operation.payload.id)
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
          const { source, target, label, properties, id } = operation.payload
          
          // Check if both source and target nodes exist
          const sourceNode = newState.data.nodes.find(n => n.id === source)
          const targetNode = newState.data.nodes.find(n => n.id === target)
          
          if (sourceNode && targetNode) {
            // Check if edge already exists to avoid duplicates
            const edgeExists = newState.data.edges.some(e => 
              e.source === source && e.target === target && e.type === label
            )
            
            if (!edgeExists) {
              const edge = {
                id: id || `${source}_${target}`,
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
            nodes: newState.data.nodes.filter(n => n.id !== operation.payload.id),
            edges: newState.data.edges.filter(e => 
              e.source !== operation.payload.id && e.target !== operation.payload.id
            )
          }
          break
        case 'DELETE_EDGE':
          // Check if the edge exists before trying to delete it
          if (newState.data.edges.some(e => e.id === operation.payload.id)) {
            newState.data = {
              ...newState.data,
              edges: newState.data.edges.filter(e => e.id !== operation.payload.id)
            }
          }
          break
        case 'UPDATE_NODE': {
          const nodeIndex = newState.data.nodes.findIndex(n => n.id === operation.payload.id)
          if (nodeIndex !== -1) {
            newState.data = {
              ...newState.data,
              nodes: [
                ...newState.data.nodes.slice(0, nodeIndex),
                { ...newState.data.nodes[nodeIndex], properties: operation.payload.properties },
                ...newState.data.nodes.slice(nodeIndex + 1)
              ]
            }
          }
          break
        }
        case 'UPDATE_EDGE': {
          const edgeIndex = newState.data.edges.findIndex(e => e.id === operation.payload.id)
          if (edgeIndex !== -1) {
            newState.data = {
              ...newState.data,
              edges: [
                ...newState.data.edges.slice(0, edgeIndex),
                { ...newState.data.edges[edgeIndex], properties: operation.payload.properties },
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
      const response = await fetch(`/api/graph/${initialData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphData)
      })
      if (!response.ok) throw new Error('Failed to save graph')
      
      const savedData = await response.json()
      
      // Clear local storage after successful save
      if (typeof window !== 'undefined' && initialData.id) {
        localStorage.removeItem(`graph_state_${initialData.id}`)
      }
      
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
  }, [graphData, initialData])

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