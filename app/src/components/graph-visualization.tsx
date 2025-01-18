'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Undo2, Redo2 } from 'lucide-react'
import type { GraphData, NodeType, EdgeType } from '@/types/graph'
import { useGraphState } from '@/hooks/useGraphState'
import { NODE_TYPES, EDGE_TYPES } from '@/types/graph'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'

const LoadingGraph = () => (
  <div className="w-full h-full min-h-[600px] flex items-center justify-center text-gray-400">
    Loading graph visualization...
  </div>
)

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { 
    ssr: false, 
    loading: () => <LoadingGraph /> 
  }
) as any // TODO: Add proper typing

// Cache for consistent color assignment
const colorCache: Record<string, string> = {}
const seenTypes: string[] = []

function getNodeColor(type: string): string {
  // If type not seen before, add to seen types
  if (!colorCache[type]) {
    const index = seenTypes.length
    seenTypes.push(type)
    // Generate evenly distributed hue values based on the index
    const hue = index * (360 / Math.max(1, seenTypes.length))
    // Use high saturation and medium lightness for vibrant but readable colors
    colorCache[type] = `hsl(${hue}, 70%, 60%)`
  }

  return colorCache[type] || '#a0aec0'
} 

interface GraphVisualizationProps {
  graphData: GraphData | null
}

interface NodeFormData {
  type: NodeType
  properties: Record<string, any>
}

interface EdgeFormData {
  type: EdgeType
  sourceId?: string
  targetId?: string
  properties: Record<string, any>
}

interface ProcessedNode {
  id: string
  name: string
  type: string
  color: string
  properties: Record<string, any>
  x?: number
  y?: number
  vx?: number
  vy?: number
}

interface ProcessedLink {
  source: ProcessedNode | { id: string }
  target: ProcessedNode | { id: string }
  name: string
  properties: Record<string, any>
}

interface ProcessedGraphData {
  nodes: ProcessedNode[]
  links: ProcessedLink[]
}

interface SelectedElement {
  type: 'node' | 'link'
  data: ProcessedNode | ProcessedLink
}

export function GraphVisualization({ graphData: initialData }: GraphVisualizationProps) {
  const {
    graphData,
    history,
    canUndo,
    canRedo,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    updateEdge,
    deleteEdge,
    undo,
    redo
  } = useGraphState(initialData || { nodes: [], edges: [] })

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false)
  const [isEdgeDialogOpen, setIsEdgeDialogOpen] = useState(false)
  const [nodeFormData, setNodeFormData] = useState<NodeFormData>({ type: 'Person', properties: {} })
  const [edgeFormData, setEdgeFormData] = useState<EdgeFormData>({ type: 'WORKS_AT', properties: {} })
  const [dragSourceNode, setDragSourceNode] = useState<ProcessedNode | null>(null)
  const [lastProcessedData, setLastProcessedData] = useState<ProcessedGraphData | null>(null)
  const graphRef = useRef<any>(null)

  // Add resize handler
  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('graph-container')
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight || 600
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Process graph data for ForceGraph2D
  const processedNodes = graphData.nodes.map(node => {
    // Find existing node to preserve its position
    const existingNode = lastProcessedData?.nodes?.find(n => n.id === node.id)
    return {
      id: node.id,
      name: node.label,
      type: node.type,
      color: getNodeColor(node.type),
      properties: node.properties,
      // Preserve positions if they exist
      x: existingNode?.x ?? undefined,
      y: existingNode?.y ?? undefined,
      vx: existingNode?.vx ?? undefined,
      vy: existingNode?.vy ?? undefined
    }
  })

  const processedLinks = graphData.edges.map(edge => {
    // Find the actual node objects for source and target
    const sourceNode = processedNodes.find(n => n.id === edge.source)
    const targetNode = processedNodes.find(n => n.id === edge.target)
    
    // Only create the link if both nodes exist
    if (sourceNode && targetNode) {
      return {
        source: sourceNode,
        target: targetNode,
        name: edge.label || edge.type, // Use label if available, fallback to type
        id: `${edge.source}_${edge.target}`, // Add unique ID for the edge
        properties: edge.properties || {}
      }
    }
    return null
  }).filter(Boolean) as ProcessedLink[]

  const processedData: ProcessedGraphData = {
    nodes: processedNodes,
    links: processedLinks
  }

  // Update last processed data when graph data changes
  useEffect(() => {
    setLastProcessedData(processedData)
  }, [graphData])

  const handleNodeClick = (node: any) => {
    if (dragSourceNode) {
      // If we have a dragSourceNode, we're in edge creation mode
      if (node.id && dragSourceNode.id && node.id !== dragSourceNode.id) {
        setEdgeFormData(prev => ({
          ...prev,
          sourceId: dragSourceNode.id,
          targetId: node.id
        }))
        setIsEdgeDialogOpen(true)
        setDragSourceNode(null)
      }
    } else {
      // Normal node selection
      setSelectedElement({ type: 'node', data: node as ProcessedNode })
    }
  }

  const handleLinkClick = (link: any) => {
    setSelectedElement({ type: 'link', data: link as ProcessedLink })
  }

  const handleBackgroundClick = () => {
    setSelectedElement(null)
  }

  const handleNodeDrag = (node: any, translate: { x: number, y: number }) => {
    if (dragSourceNode && node !== dragSourceNode) {
      if (node.id && dragSourceNode.id) {
        setEdgeFormData(prev => ({
          ...prev,
          sourceId: dragSourceNode.id,
          targetId: node.id
        }))
        setIsEdgeDialogOpen(true)
      }
      setDragSourceNode(null)
    }
  }

  const handleCreateNode = async () => {
    try {
      await addNode(nodeFormData.type, nodeFormData.properties)
      setIsNodeDialogOpen(false)
      setNodeFormData({ type: 'Person', properties: {} })
    } catch (error) {
      console.error('Error creating node:', error)
    }
  }

  const handleCreateEdge = async () => {
    try {
      if (!edgeFormData.sourceId || !edgeFormData.targetId) return

      // Create edge with label matching the type
      const edge = await addEdge(
        edgeFormData.sourceId,
        edgeFormData.targetId,
        edgeFormData.type,
        {
          ...edgeFormData.properties,
          label: edgeFormData.type // Add label property
        }
      )

      // Reset form and states
      setIsEdgeDialogOpen(false)
      setEdgeFormData({ type: 'WORKS_AT', properties: {} })
      setDragSourceNode(null)

      // Force a re-render of the graph
      setLastProcessedData(null)
    } catch (error) {
      console.error('Error creating edge:', error)
    }
  }

  const handleUpdateProperties = async () => {
    try {
      if (!selectedElement) return

      if (selectedElement.type === 'node') {
        const node = selectedElement.data as ProcessedNode
        await updateNode(node.id, node.properties)
      } else {
        const link = selectedElement.data as ProcessedLink
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id
        const targetId = typeof link.target === 'string' ? link.target : link.target.id
        await updateEdge(`${sourceId}_${targetId}`, link.properties)
      }
      setSelectedElement(null)
    } catch (error) {
      console.error('Error updating properties:', error)
    }
  }

  const handleDelete = async () => {
    try {
      if (!selectedElement) return

      if (selectedElement.type === 'node') {
        const node = selectedElement.data as ProcessedNode
        await deleteNode(node.id)
      } else {
        const link = selectedElement.data as ProcessedLink
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id
        const targetId = typeof link.target === 'string' ? link.target : link.target.id
        await deleteEdge(`${sourceId}_${targetId}`)
      }
      setSelectedElement(null)
    } catch (error) {
      console.error('Error deleting element:', error)
    }
  }

  const updateSelectedElementName = (value: string) => {
    setSelectedElement(prev => {
      if (!prev) return null
      return {
        type: prev.type,
        data: {
          ...prev.data,
          name: value
        }
      } as SelectedElement
    })
  }

  const updateSelectedElementProperty = (key: string, value: string) => {
    setSelectedElement(prev => {
      if (!prev) return null
      return {
        type: prev.type,
        data: {
          ...prev.data,
          properties: {
            ...(prev.data.properties || {}),
            [key]: value
          }
        }
      } as SelectedElement
    })
  }

  if (!graphData) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center text-gray-400">
        No graph data available
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNodeDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Node
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-sm text-gray-500">
          {history.length} changes
        </div>
      </div>

      <div id="graph-container" className="flex-1 relative border rounded-lg overflow-hidden">
        <ContextMenu>
          <ContextMenuTrigger>
            <ForceGraph2D
              ref={graphRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={processedData}
              nodeLabel={(node: any) => (node as ProcessedNode).name}
              linkLabel={(link: any) => (link as ProcessedLink).name}
              nodeColor={(node: any) => (node as ProcessedNode).color}
              linkColor={(link: any) => '#999999'}
              nodeRelSize={6}
              linkWidth={1}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={2}
              onNodeClick={handleNodeClick}
              onLinkClick={handleLinkClick}
              onBackgroundClick={handleBackgroundClick}
              onNodeDrag={handleNodeDrag}
              enableNodeDrag={true}
              enableZoomInteraction={true}
              enablePanInteraction={true}
              autoPauseRedraw={false}
              warmupTicks={100}
              cooldownTicks={50}
            />
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => setIsNodeDialogOpen(true)}>
              Add Node
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* Node Creation Dialog */}
      <Dialog open={isNodeDialogOpen} onOpenChange={setIsNodeDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle>Create New Node</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">Type</label>
              <select
                className="col-span-3 bg-white dark:bg-gray-700"
                value={nodeFormData.type}
                onChange={e => setNodeFormData(prev => ({ ...prev, type: e.target.value as NodeType }))}
              >
                {NODE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">Name</label>
              <input
                className="col-span-3 bg-white dark:bg-gray-700"
                value={nodeFormData.properties.name || ''}
                onChange={e => setNodeFormData(prev => ({
                  ...prev,
                  properties: { ...prev.properties, name: e.target.value }
                }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateNode}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edge Creation Dialog */}
      <Dialog open={isEdgeDialogOpen} onOpenChange={setIsEdgeDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle>Create New Relationship</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">Type</label>
              <select
                className="col-span-3 bg-white dark:bg-gray-700"
                value={edgeFormData.type}
                onChange={e => setEdgeFormData(prev => ({ ...prev, type: e.target.value as EdgeType }))}
              >
                {EDGE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateEdge}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Property Editor */}
      {selectedElement && (
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-80 border border-gray-200 dark:border-gray-700 backdrop-blur-lg backdrop-filter">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {selectedElement.type === 'node' ? 'Node Properties' : 'Relationship Properties'}
            </h3>
            <button
              onClick={() => setSelectedElement(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          {selectedElement.type === 'node' && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Type:</span>
                <span>{(selectedElement.data as ProcessedNode).type}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Name:</span>
                <input
                  value={(selectedElement.data as ProcessedNode).name || ''}
                  onChange={e => updateSelectedElementName(e.target.value)}
                  className="border rounded px-2 py-1"
                />
              </div>
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Properties:</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const key = prompt('Enter property name:')
                      if (key) updateSelectedElementProperty(key, '')
                    }}
                  >
                    Add Property
                  </Button>
                </div>
                {Object.entries((selectedElement.data as ProcessedNode).properties)
                  .filter(([key]) => key !== 'name')
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1 border-b">
                      <span>{key}:</span>
                      <div className="flex gap-2">
                        <input
                          value={value as string}
                          onChange={e => updateSelectedElementProperty(key, e.target.value)}
                          className="border rounded px-2 py-1"
                        />
                        <button
                          onClick={() => {
                            const newProps = { ...(selectedElement.data as ProcessedNode).properties }
                            delete newProps[key]
                            setSelectedElement(prev => prev ? {
                              ...prev,
                              data: { ...prev.data, properties: newProps }
                            } : null)
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {selectedElement.type === 'link' && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Type:</span>
                <span>{(selectedElement.data as ProcessedLink).name}</span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Properties:</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const key = prompt('Enter property name:')
                      if (key) updateSelectedElementProperty(key, '')
                    }}
                  >
                    Add Property
                  </Button>
                </div>
                {Object.entries((selectedElement.data as ProcessedLink).properties || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1 border-b">
                    <span>{key}:</span>
                    <div className="flex gap-2">
                      <input
                        value={value as string}
                        onChange={e => updateSelectedElementProperty(key, e.target.value)}
                        className="border rounded px-2 py-1"
                      />
                      <button
                        onClick={() => {
                          const newProps = { ...(selectedElement.data as ProcessedLink).properties }
                          delete newProps[key]
                          setSelectedElement(prev => prev ? {
                            ...prev,
                            data: { ...prev.data, properties: newProps }
                          } : null)
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 mt-4">
            {selectedElement.type === 'node' && (
              <Button
                variant="outline"
                onClick={() => {
                  setDragSourceNode(selectedElement.data as ProcessedNode)
                  setSelectedElement(null)
                }}
              >
                Create Edge
              </Button>
            )}
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
            <Button onClick={handleUpdateProperties}>
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 