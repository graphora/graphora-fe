'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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
  } = useGraphState(initialData)

  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)
  const [showNodeForm, setShowNodeForm] = useState(false)
  const [showEdgeForm, setShowEdgeForm] = useState(false)
  const [nodeFormData, setNodeFormData] = useState<NodeFormData>({ type: NODE_TYPES[0], properties: {} })
  const [edgeFormData, setEdgeFormData] = useState<EdgeFormData>({ type: EDGE_TYPES[0], properties: {} })
  const graphRef = useRef<any>(null)

  const processedData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] }

    return {
      nodes: graphData.nodes.map(node => ({
        ...node,
        name: node.label,
        color: getNodeColor(node.type)
      })),
      links: graphData.edges.map(edge => ({
        ...edge,
        name: edge.label,
        source: edge.source,
        target: edge.target
      }))
    }
  }, [graphData])

  return (
    <div className="relative w-full h-full min-h-[600px] bg-background">
      {/* Graph Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button variant="outline" size="icon" onClick={undo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={redo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setShowNodeForm(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Graph Visualization */}
      <ContextMenu>
        <ContextMenuTrigger>
          <ForceGraph2D
            ref={graphRef}
            graphData={processedData}
            nodeLabel="name"
            nodeColor="color"
            nodeRelSize={6}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            linkLabel="name"
            onNodeClick={(node: ProcessedNode) => {
              setSelectedElement({ type: 'node', data: node })
            }}
            onLinkClick={(link: ProcessedLink) => {
              setSelectedElement({ type: 'link', data: link })
            }}
            nodeCanvasObject={(node: ProcessedNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.properties?.name || node.id
              const fontSize = 12/globalScale
              ctx.font = `${fontSize}px Sans-Serif`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              
              // Draw node
              ctx.beginPath()
              ctx.arc(node.x!, node.y!, 4, 0, 2 * Math.PI)
              ctx.fillStyle = node.color
              ctx.fill()
              
              // Draw text below node with background
              const textWidth = ctx.measureText(label).width
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.5)
              const textY = node.y! + 10 // Position text below node
              
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
            width={window.innerWidth - 48} // Adjust width to prevent cutoff
            height={window.innerHeight - 200} // Adjust height to fit screen
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
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Type:</span>
                  <span>{(selectedElement.data as ProcessedNode).type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Name:</span>
                  <input
                    value={(selectedElement.data as ProcessedNode).name || ''}
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
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between py-1 border-b">
                        <span>{key}:</span>
                        <div className="flex gap-2">
                          <input
                            value={value as string}
                            onChange={e => setSelectedElement(prev => prev ? {
                              ...prev,
                              data: { ...prev.data, properties: { ...prev.data.properties, [key]: e.target.value } }
                            } : null)}
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
                        if (key) setSelectedElement(prev => prev ? {
                          ...prev,
                          data: { ...prev.data, properties: { ...prev.data.properties, [key]: '' } }
                        } : null)
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
                          onChange={e => setSelectedElement(prev => prev ? {
                            ...prev,
                            data: { ...prev.data, properties: { ...prev.data.properties, [key]: e.target.value } }
                          } : null)}
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
                    // TODO: Implement edge creation
                  }}
                >
                  Create Edge
                </Button>
              )}
              <Button variant="destructive" onClick={() => {
                if (selectedElement.type === 'node') {
                  deleteNode((selectedElement.data as ProcessedNode).id)
                } else {
                  const sourceId = typeof (selectedElement.data as ProcessedLink).source === 'string' ? (selectedElement.data as ProcessedLink).source : (selectedElement.data as ProcessedLink).source.id
                  const targetId = typeof (selectedElement.data as ProcessedLink).target === 'string' ? (selectedElement.data as ProcessedLink).target : (selectedElement.data as ProcessedLink).target.id
                  deleteEdge(`${sourceId}_${targetId}`)
                }
                setSelectedElement(null)
              }}>
                Delete
              </Button>
              <Button onClick={() => {
                if (selectedElement.type === 'node') {
                  updateNode((selectedElement.data as ProcessedNode).id, (selectedElement.data as ProcessedNode).properties)
                } else {
                  const sourceId = typeof (selectedElement.data as ProcessedLink).source === 'string' ? (selectedElement.data as ProcessedLink).source : (selectedElement.data as ProcessedLink).source.id
                  const targetId = typeof (selectedElement.data as ProcessedLink).target === 'string' ? (selectedElement.data as ProcessedLink).target : (selectedElement.data as ProcessedLink).target.id
                  updateEdge(`${sourceId}_${targetId}`, (selectedElement.data as ProcessedLink).properties)
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
          </div>
          <DialogFooter>
            <Button onClick={() => {
              // TODO: Implement edge creation
              setShowEdgeForm(false)
              setEdgeFormData({ type: EDGE_TYPES[0], properties: {} })
            }}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 