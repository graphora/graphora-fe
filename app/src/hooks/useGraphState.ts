import { useState, useCallback } from 'react'
import type { GraphData, GraphOperation, GraphState, Node, Edge, NodeType, EdgeType } from '@/types/graph'

let historyIdCounter = 0
function generateHistoryId(): string {
  return `hist_${Date.now()}_${++historyIdCounter}`
}

export function useGraphState(initialData: GraphData) {
  const [state, setState] = useState<GraphState>({
    data: initialData,
    history: [],
    undoStack: [],
    redoStack: []
  })

  const addNode = useCallback(async (type: NodeType, properties: Record<string, any>) => {
    try {
      const response = await fetch('/api/graph/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, properties })
      })

      if (!response.ok) throw new Error('Failed to create node')
      
      const node = await response.json()
      const operation: GraphOperation = { type: 'CREATE_NODE', payload: { type, properties } }
      
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          nodes: [...prev.data.nodes, node]
        },
        history: [...prev.history, {
          id: generateHistoryId(),
          operation,
          timestamp: new Date().toISOString(),
          user: 'current-user' // Replace with actual user info
        }],
        undoStack: [...prev.undoStack, operation],
        redoStack: []
      }))

      return node
    } catch (error) {
      console.error('Error adding node:', error)
      throw error
    }
  }, [])

  const updateNode = useCallback(async (nodeId: string, properties: Record<string, any>) => {
    try {
      const response = await fetch(`/api/graph/nodes?nodeId=${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties })
      })

      if (!response.ok) throw new Error('Failed to update node')
      
      const updatedNode = await response.json()
      const operation: GraphOperation = { type: 'UPDATE_NODE', payload: { id: nodeId, properties } }
      
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          nodes: prev.data.nodes.map(node => 
            node.id === nodeId ? updatedNode : node
          )
        },
        history: [...prev.history, {
          id: generateHistoryId(),
          operation,
          timestamp: new Date().toISOString(),
          user: 'current-user'
        }],
        undoStack: [...prev.undoStack, operation],
        redoStack: []
      }))

      return updatedNode
    } catch (error) {
      console.error('Error updating node:', error)
      throw error
    }
  }, [])

  const deleteNode = useCallback(async (nodeId: string) => {
    try {
      const response = await fetch(`/api/graph/nodes?nodeId=${nodeId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete node')
      
      const operation: GraphOperation = { type: 'DELETE_NODE', payload: { id: nodeId } }
      
      setState(prev => ({
        ...prev,
        data: {
          nodes: prev.data.nodes.filter(node => node.id !== nodeId),
          edges: prev.data.edges.filter(edge => 
            edge.source !== nodeId && edge.target !== nodeId
          )
        },
        history: [...prev.history, {
          id: generateHistoryId(),
          operation,
          timestamp: new Date().toISOString(),
          user: 'current-user'
        }],
        undoStack: [...prev.undoStack, operation],
        redoStack: []
      }))
    } catch (error) {
      console.error('Error deleting node:', error)
      throw error
    }
  }, [])

  const addEdge = useCallback(async (sourceId: string, targetId: string, type: EdgeType, properties: Record<string, any> = {}) => {
    try {
      const response = await fetch('/api/graph/edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, targetId, type, properties })
      })

      if (!response.ok) throw new Error('Failed to create edge')
      
      const edge = await response.json()
      const operation: GraphOperation = { 
        type: 'CREATE_EDGE', 
        payload: { 
          source: sourceId, 
          target: targetId, 
          label: type, 
          properties,
          id: `${sourceId}_${targetId}` // Store the edge ID for recreation
        } 
      }
      
      const newEdge = {
        id: edge.id,
        source: sourceId,
        target: targetId,
        type: type,
        label: type,
        properties: properties
      }
      
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          edges: [...prev.data.edges, newEdge]
        },
        history: [...prev.history, {
          id: generateHistoryId(),
          operation,
          timestamp: new Date().toISOString(),
          user: 'current-user'
        }],
        undoStack: [...prev.undoStack, operation],
        redoStack: []
      }))

      return newEdge
    } catch (error) {
      console.error('Error adding edge:', error)
      throw error
    }
  }, [])

  const updateEdge = useCallback(async (edgeId: string, properties: Record<string, any>) => {
    try {
      const response = await fetch(`/api/graph/edges?edgeId=${edgeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties })
      })

      if (!response.ok) throw new Error('Failed to update edge')
      
      const updatedEdge = await response.json()
      const operation: GraphOperation = { type: 'UPDATE_EDGE', payload: { id: edgeId, properties } }
      
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          edges: prev.data.edges.map(edge => 
            edge.id === edgeId ? updatedEdge : edge
          )
        },
        history: [...prev.history, {
          id: generateHistoryId(),
          operation,
          timestamp: new Date().toISOString(),
          user: 'current-user'
        }],
        undoStack: [...prev.undoStack, operation],
        redoStack: []
      }))

      return updatedEdge
    } catch (error) {
      console.error('Error updating edge:', error)
      throw error
    }
  }, [])

  const deleteEdge = useCallback(async (edgeId: string) => {
    try {
      const response = await fetch(`/api/graph/edges?edgeId=${edgeId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete edge')
      
      setState(prev => {
        // Find the edge before deleting it
        const edgeToDelete = prev.data.edges.find(edge => edge.id === edgeId)
        if (!edgeToDelete) return prev

        const operation: GraphOperation = { 
          type: 'DELETE_EDGE', 
          payload: { 
            id: edgeId,
            edge: edgeToDelete // Store complete edge information
          } 
        }
        
        return {
          ...prev,
          data: {
            ...prev.data,
            edges: prev.data.edges.filter(edge => edge.id !== edgeId)
          },
          history: [...prev.history, {
            id: generateHistoryId(),
            operation,
            timestamp: new Date().toISOString(),
            user: 'current-user'
          }],
          undoStack: [...prev.undoStack, operation],
          redoStack: []
        }
      })
    } catch (error) {
      console.error('Error deleting edge:', error)
      throw error
    }
  }, [])

  const undo = useCallback(() => {
    setState(prev => {
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
    setState(prev => {
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

  return {
    graphData: state.data,
    history: state.history,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    updateEdge,
    deleteEdge,
    undo,
    redo
  }
} 