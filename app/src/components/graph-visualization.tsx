'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { GraphData, NodeType, EdgeType } from '@/types/graph'
import { useGraphState } from '@/hooks/useGraphState'
import { NODE_TYPES, EDGE_TYPES } from '@/types/graph'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { GraphControls } from '@/components/graph-controls'

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
  onGraphReset?: () => Promise<void>
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
  id: string
}

interface ProcessedGraphData {
  nodes: ProcessedNode[]
  links: ProcessedLink[]
}

interface SelectedElement {
  type: 'node' | 'link'
  data: ProcessedNode | ProcessedLink
}

export function GraphVisualization({ graphData: initialData, onGraphReset }: GraphVisualizationProps) {
  console.log('GraphVisualization received initialData:', initialData)
  const router = useRouter()
  
  // Ensure initialData has the required structure
  const validInitialData = useMemo(() => {
    if (!initialData) {
      return { nodes: [], edges: [], total_nodes: 0, total_edges: 0 }
    }
    return {
      ...initialData,
      nodes: initialData.nodes?.map(node => ({
        ...node,
        label: node.label || node.type,
        properties: node.properties || {}
      })) || [],
      edges: initialData.edges?.map(edge => ({
        ...edge,
        label: edge.type,
        properties: edge.properties || {}
      })) || []
    }
  }, [initialData])
  
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
    redo,
    saveGraph,
    resetGraph
  } = useGraphState(validInitialData)

  console.log('GraphVisualization processed graphData:', graphData)
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)
  const [showNodeForm, setShowNodeForm] = useState(false)
  const [showEdgeForm, setShowEdgeForm] = useState(false)
  const [nodeFormData, setNodeFormData] = useState<NodeFormData>({ type: NODE_TYPES[0], properties: {} })
  const [edgeFormData, setEdgeFormData] = useState<EdgeFormData>({ type: EDGE_TYPES[0], properties: {} })
  const graphRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    // Update dimensions on mount and window resize
    function updateDimensions() {
      setDimensions({
        width: window.innerWidth - 48,
        height: window.innerHeight - 200
      });
    }

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const processedData = useMemo(() => {
    if (!graphData?.nodes || !graphData?.edges) return { nodes: [], links: [] }

    return {
      nodes: graphData.nodes.map(node => ({
        ...node,
        name: node.label || node.type,
        color: getNodeColor(node.type),
        id: node.id.toString() // Ensure ID is a string
      })),
      links: graphData.edges.map(edge => ({
        ...edge,
        name: edge.type,
        source: edge.source.toString(), // Ensure source is a string
        target: edge.target.toString(), // Ensure target is a string
        // id: edge.id.toString() // Ensure ID is a string
      }))
    }
  }, [graphData])

  return (
    <div className="w-full h-full relative">
      {/* Graph Controls */}
      <div className="absolute top-4 left-4 z-10">
        <GraphControls
          onReset={async () => {
            try {
              // First call the parent's reset if provided
              if (onGraphReset) {
                await onGraphReset()
              }
              // Then reset the local graph state
              await resetGraph()
            } catch (error) {
              console.error('Error resetting graph:', error)
            }
          }}
          onSave={saveGraph}
          onUndo={undo}
          onRedo={redo}
          onAddNode={() => setShowNodeForm(true)}
          hasChanges={history.length > 0}
          isLoading={false}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </div>

      {/* Graph Visualization */}
      <div className="w-full h-full">
        <ContextMenu>
          <ContextMenuTrigger>
            <ForceGraph2D
              ref={graphRef}
              graphData={processedData}
              nodeLabel="name"
              nodeColor="color"
              linkColor="#999"
              linkWidth={4}
              linkDirectionalArrowLength={10}
              linkDirectionalArrowRelPos={1}
              linkLabel="name"
              d3AlphaDecay={0.01}
              d3VelocityDecay={0.4}
              cooldownTime={200}
              onNodeClick={(node: ProcessedNode) => {
                setSelectedElement({ type: 'node', data: node })
              }}
              onLinkClick={(link: ProcessedLink) => {
                setSelectedElement({ type: 'link', data: link })
              }}
              nodeCanvasObject={(node: ProcessedNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
                const label = node.properties?.name || node.type
                const fontSize = 12/globalScale
                ctx.font = `${fontSize}px Sans-Serif`
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                
                // Draw node
                ctx.beginPath()
                ctx.arc(node.x!, node.y!, 8, 0, 2 * Math.PI)
                ctx.fillStyle = node.color
                ctx.fill()
                
                // Draw text below node with background
                const textWidth = ctx.measureText(label).width
                const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.5)
                const textY = node.y! + 10
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
                ctx.fillRect(
                  node.x! - bckgDimensions[0] / 2,
                  textY - bckgDimensions[1] / 2,
                  bckgDimensions[0],
                  bckgDimensions[1]
                )
                
                ctx.fillStyle = '#000'
                ctx.fillText(label, node.x!, textY)
              }}
              width={dimensions.width}
              height={dimensions.height}
              
            />
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => setShowNodeForm(true)}>
              Add Node
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Node/Edge Details Dialog - Position it away from the top-left */}
        {selectedElement && (
          <Dialog open={!!selectedElement} onOpenChange={() => setSelectedElement(null)}>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900">
              <DialogHeader>
                <DialogTitle>
                  {selectedElement.type === 'node' ? 'Node Details' : 'Edge Details'}
                </DialogTitle>
              </DialogHeader>
              {selectedElement.type === 'node' && (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="font-medium">Type:</span>
                    <span>{(selectedElement.data as ProcessedNode).type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <input
                      value={(selectedElement.data as ProcessedNode).properties?.name || ''}
                      onChange={e => setSelectedElement(prev => prev ? {
                        ...prev,
                        data: { ...prev.data, name: e.target.value }
                      } : null)}
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
                          if (key) setSelectedElement(prev => prev ? {
                            ...prev,
                            data: { ...prev.data, properties: { ...prev.data.properties, [key]: '' } }
                          } : null)
                        }}
                      >
                        Add Property
                      </Button>
                    </div>
                    {Object.entries((selectedElement.data as ProcessedNode).properties)
                      .filter(([key]) => key !== 'name')
                      .map(([key, value]) => {
                        const isSystemProperty = key.startsWith('_')
                        return (
                          <div key={key} className="flex justify-between py-1 border-b">
                            <span>{key}:</span>
                            <div className="flex gap-2">
                              <input
                                className={`flex-1 bg-transparent ${isSystemProperty ? 'text-gray-500 cursor-not-allowed' : ''}`}
                                value={selectedElement.data.properties[key] ?? ''}
                                onChange={e => {
                                  if (isSystemProperty) return
                                  const newProps = { ...(selectedElement.data as ProcessedNode).properties }
                                  if (e.target.value === '') {
                                    newProps[key] = null
                                  } else {
                                    newProps[key] = e.target.value
                                  }
                                  setSelectedElement(prev => prev ? {
                                    ...prev,
                                    data: { ...prev.data, properties: newProps }
                                  } : null)
                                  updateNode((selectedElement.data as ProcessedNode).id, newProps)
                                }}
                                readOnly={isSystemProperty}
                              />
                              {!isSystemProperty && (
                                <button
                                  onClick={() => {
                                    const newProps = { ...(selectedElement.data as ProcessedNode).properties }
                                    newProps[key] = null
                                    setSelectedElement(prev => prev ? {
                                      ...prev,
                                      data: { ...prev.data, properties: {
                                        ...newProps,
                                        [key]: '' // Use empty string for display
                                      }}
                                    } : null)
                                    updateNode((selectedElement.data as ProcessedNode).id, newProps)
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-2">Create Edge</h4>
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 items-center gap-2">
                        <label className="text-sm">Type:</label>
                        <select
                          className="col-span-3 border rounded px-2 py-1"
                          value={edgeFormData.type}
                          onChange={e => setEdgeFormData(prev => ({ ...prev, type: e.target.value as EdgeType }))}
                        >
                          {EDGE_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-2">
                        <label className="text-sm">Target:</label>
                        <select
                          className="col-span-3 border rounded px-2 py-1"
                          value={edgeFormData.targetId}
                          onChange={e => setEdgeFormData(prev => ({ ...prev, targetId: e.target.value }))}
                        >
                          <option value="">Select target node</option>
                          {graphData?.nodes
                            .filter(node => node.id !== (selectedElement.data as ProcessedNode).id)
                            .map(node => (
                              <option key={node.id} value={node.id}>
                                {node.properties?.name || node.id}
                              </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        className="w-full mt-2"
                        disabled={!edgeFormData.targetId}
                        onClick={() => {
                          const sourceNode = (selectedElement.data as ProcessedNode).id
                          const targetNode = edgeFormData.targetId
                          if (sourceNode && targetNode) {
                            addEdge(
                              sourceNode,
                              targetNode,
                              edgeFormData.type,
                              {}
                            )
                            setSelectedElement(null)
                          }
                        }}
                      >
                        Create Edge
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {selectedElement.type === 'link' && (
                <div className="space-y-4">
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
                          if (key) setSelectedElement(prev => prev ? {
                            ...prev,
                            data: { ...prev.data, properties: { ...prev.data.properties, [key]: '' } }
                          } : null)
                        }}
                      >
                        Add Property
                      </Button>
                    </div>
                    {Object.entries((selectedElement.data as ProcessedLink).properties || {}).map(([key, value]) => {
                      const isSystemProperty = key.startsWith('_')
                      return (
                        <div key={key} className="flex justify-between py-1 border-b">
                          <span>{key}:</span>
                          <div className="flex gap-2">
                            <input
                              className={`flex-1 bg-transparent ${isSystemProperty ? 'text-gray-500 cursor-not-allowed' : ''}`}
                              value={selectedElement.data.properties[key] ?? ''}
                              onChange={e => {
                                if (isSystemProperty) return
                                const newProps = { ...(selectedElement.data as ProcessedLink).properties }
                                if (e.target.value === '') {
                                  newProps[key] = null
                                } else {
                                  newProps[key] = e.target.value
                                }
                                setSelectedElement(prev => prev ? {
                                  ...prev,
                                  data: { ...prev.data, properties: newProps }
                                } : null)
                                updateEdge((selectedElement.data as ProcessedLink).id, newProps)
                              }}
                              readOnly={isSystemProperty}
                            />
                            {!isSystemProperty && (
                              <button
                                onClick={() => {
                                  const newProps = { ...(selectedElement.data as ProcessedLink).properties }
                                  newProps[key] = null
                                  setSelectedElement(prev => prev ? {
                                    ...prev,
                                    data: { ...prev.data, properties: {
                                      ...newProps,
                                      [key]: '' // Use empty string for display
                                    }}
                                  } : null)
                                  updateEdge((selectedElement.data as ProcessedLink).id, newProps)
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="destructive" onClick={() => {
                  if (selectedElement.type === 'node') {
                    deleteNode((selectedElement.data as ProcessedNode).id)
                  } else {
                    deleteEdge((selectedElement.data as ProcessedLink).id)
                  }
                  setSelectedElement(null)
                }}>
                  Delete
                </Button>
                <Button onClick={() => {
                  if (selectedElement.type === 'node') {
                    updateNode((selectedElement.data as ProcessedNode).id, (selectedElement.data as ProcessedNode).properties)
                  } else {
                    updateEdge((selectedElement.data as ProcessedLink).id, (selectedElement.data as ProcessedLink).properties)
                  }
                  setSelectedElement(null)
                }}>
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {/* Node Creation Dialog */}
        <Dialog open={showNodeForm} onOpenChange={setShowNodeForm}>
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
              <Button onClick={() => {
                addNode(nodeFormData.type, nodeFormData.properties)
                setShowNodeForm(false)
                setNodeFormData({ type: NODE_TYPES[0], properties: {} })
              }}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edge Creation Dialog */}
        <Dialog open={showEdgeForm} onOpenChange={setShowEdgeForm}>
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
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right">Target Node</label>
                <select
                  className="col-span-3 bg-white dark:bg-gray-700"
                  value={edgeFormData.targetId}
                  onChange={e => setEdgeFormData(prev => ({ ...prev, targetId: e.target.value }))}
                >
                  {graphData?.nodes.map(node => (
                    <option key={node.id} value={node.id}>{node.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => {
                addEdge(edgeFormData.sourceId!, edgeFormData.targetId!, 
                   edgeFormData.type,
                   edgeFormData.properties)
                setShowEdgeForm(false)
                setEdgeFormData({ type: EDGE_TYPES[0], properties: {} })
              }}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {/* Bottom Actions */}
      <div className="flex justify-end p-4 bg-background border-t">
        <Button onClick={() => router.push('/merge')}>
          Merge
        </Button>
      </div>
    </div>
  )
} 