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
import { forceCenter, forceLink, forceManyBody } from 'd3-force'

// Dynamic color generator (similar to the previous component)
const stringToColor = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase()
  return '#' + '00000'.substring(0, 6 - c.length) + c
}

const SPECIAL_COLORS = {
  default: '#6b7280'
} as const

const LoadingGraph = () => (
  <div className="w-full h-full min-h-[600px] flex items-center justify-center text-gray-400">
    Loading graph visualization...
  </div>
)

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false, loading: () => <LoadingGraph /> }
)

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
  val?: number
  fx?: number
  fy?: number
}

interface ProcessedLink {
  source: ProcessedNode | { id: string }
  target: ProcessedNode | { id: string }
  name: string
  properties: Record<string, any>
  id: string
}

interface SelectedElement {
  type: 'node' | 'link'
  data: ProcessedNode | ProcessedLink
}

export function GraphVisualization({ graphData: initialData, onGraphReset }: GraphVisualizationProps) {
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

  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)
  const [showNodeForm, setShowNodeForm] = useState(false)
  const [showEdgeForm, setShowEdgeForm] = useState(false)
  const [nodeFormData, setNodeFormData] = useState<NodeFormData>({ type: NODE_TYPES[0], properties: {} })
  const [edgeFormData, setEdgeFormData] = useState<EdgeFormData>({ type: '', properties: {} })
  const [hoveredNode, setHoveredNode] = useState<ProcessedNode | null>(null)
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [typeColors, setTypeColors] = useState<Record<string, string>>({})

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  useEffect(() => {
    if (graphData?.nodes) {
      const types = Array.from(
        new Set(graphData.nodes.map((node: any) => node.type || node.label || 'default'))
      )
      const newTypeColors = types.reduce((acc: Record<string, string>, type: string) => ({
        ...acc,
        [type]: stringToColor(type)
      }), SPECIAL_COLORS)
      setTypeColors(newTypeColors)
    }
  }, [graphData])

  const processedData = useMemo(() => {
    if (!graphData?.nodes || !graphData?.edges) return { nodes: [], links: [] }

    const degreeMap = new Map()
    graphData.edges?.forEach((edge: any) => {
      degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1)
      degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1)
    })

    const nodes = graphData.nodes.map((node: any, idx: number, arr: any[]) => {
      const nodeType = node.type || node.label || 'default'
      const degree = degreeMap.get(node.id) || 1
      const baseSize = 5
      const size = baseSize + Math.log(degree + 1) * 2

      const angle = (idx / arr.length) * 2 * Math.PI
      const radius = Math.min(250, Math.sqrt(arr.length) * 40)

      return {
        ...node,
        name: node.properties?.name || node.label || node.type || `Node ${node.id}`,
        color: typeColors[nodeType] || SPECIAL_COLORS.default,
        id: node.id.toString(),
        val: size,
        fx: Math.cos(angle) * radius,
        fy: Math.sin(angle) * radius,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      }
    })

    const links = graphData.edges.map((edge: any) => ({
      ...edge,
      name: edge.type,
      source: edge.source.toString(),
      target: edge.target.toString(),
      id: edge.id.toString()
    }))

    return { nodes, links }
  }, [graphData, typeColors])

  const linkForce = useMemo(() => forceLink().distance(120).strength(0.4), [])
  const chargeForce = useMemo(() => forceManyBody().strength(-400), [])
  const centerForce = useMemo(() => forceCenter(0, 0).strength(0.08), [])

  const handleNodeClick = (node: any, event: MouseEvent) => {
    const processedNode = node as ProcessedNode;
    if (processedNode.id && processedNode.name && processedNode.type && processedNode.color) {
      setSelectedElement({ type: 'node', data: processedNode });
    }
  };

  const handleLinkClick = (link: any) => {
    const processedLink = link as ProcessedLink;
    if (processedLink.id && processedLink.source && processedLink.target) {
      setSelectedElement({ type: 'link', data: processedLink });
    }
  };

  const handleNodeHover = (node: any, previousNode: any) => {
    if (node) {
      const processedNode = node as ProcessedNode;
      setHoveredNode(processedNode)
    } else {
      setHoveredNode(null)
    }
  }
  
  // Add click listener to dismiss the tooltip
  useEffect(() => {
    const handleClick = () => {
      setHoveredNode(null);
    };
    
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div className="w-full h-full relative bg-gray-50">
      {/* Graph Controls */}
      <div className="absolute top-4 left-4 z-10">
        <GraphControls
          onReset={async () => {
            try {
              if (onGraphReset) {
                await onGraphReset()
              }
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
      <div className="w-full h-full" ref={containerRef}>
        <ContextMenu>
          <ContextMenuTrigger>
            <ForceGraph2D
              ref={graphRef}
              graphData={processedData}
              width={dimensions.width}
              height={dimensions.height}
              nodeLabel={null}
              nodeColor="color"
              linkColor="#999"
              linkWidth={2}
              linkDirectionalArrowLength={8}
              linkDirectionalArrowRelPos={1}
              linkLabel="name"
              d3AlphaDecay={0.01}
              d3VelocityDecay={0.1}
              cooldownTicks={100}
              warmupTicks={50}
              // linkForce={linkForce}
              // nodeForce={chargeForce}
              // centerForce={centerForce}
              onNodeClick={handleNodeClick}
              onLinkClick={handleLinkClick}
              onNodeHover={handleNodeHover}
              onNodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                const nodeR = node.val || 5

                ctx.beginPath()
                ctx.arc(node.x || 0, node.y || 0, nodeR, 0, 2 * Math.PI)
                ctx.fillStyle = node.color
                ctx.fill()
                ctx.strokeStyle = '#e5e7eb'
                ctx.lineWidth = 0.5
                ctx.stroke()

                // Only render text when not hovering - remove duplication with tooltip
                if (globalScale > 1.0 && hoveredNode?.id !== node.id) {
                  const label = node.properties?.name || node.label || node.type || `Node ${node.id}`
                  const fontSize = Math.min(12 / globalScale, 10)
                  ctx.font = `${fontSize}px Sans-Serif`
                  ctx.textAlign = 'center'
                  ctx.textBaseline = 'middle'
                  ctx.fillStyle = '#1f2937'
                  const displayLabel = label.length > 15 ? `${label.substring(0, 12)}...` : label
                  ctx.fillText(displayLabel, node.x || 0, (node.y || 0) + nodeR + fontSize + 2)
                }
              }}
              onEngineStop={() => {
                if (graphRef.current && graphRef.current.graphData) {
                  const { nodes } = graphRef.current.graphData()
                  nodes.forEach((node: any) => {
                    if (!node.fx && !node.fy) {
                      node.fx = node.x
                      node.fy = node.y
                    }
                  })
                  setTimeout(() => graphRef.current?.refresh(), 100)
                }
              }}
              cooldownTime={0}
            />
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => setShowNodeForm(true)}>
              Add Node
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Tooltip for hovered node */}
        {hoveredNode && (
          <div
            className="absolute bg-white p-3 rounded-lg shadow-md text-sm border-2 border-gray-200 pointer-events-none z-10"
            style={{
              left: (hoveredNode.x || 0) + dimensions.width / 2,
              top: (hoveredNode.y || 0) + dimensions.height / 2 - 40, // Position further above the node
              transform: 'translate(-50%, -100%)',
              minWidth: '120px',
              textAlign: 'center',
            }}
          >
            <div className="font-medium text-gray-800">{hoveredNode.name || hoveredNode.label || hoveredNode.type || `Node ${hoveredNode.id}`}</div>
            <div className="text-gray-600">Type: {hoveredNode.type || 'Unknown'}</div>
          </div>
        )}

        {/* Node/Edge Details Dialog */}
        {selectedElement && (
          <Dialog open={!!selectedElement} onOpenChange={() => setSelectedElement(null)} modal={true}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900">
              <DialogHeader>
                <DialogTitle>
                  {selectedElement.type === 'node' ? 'Node Details' : 'Edge Details'}
                </DialogTitle>
              </DialogHeader>
              {selectedElement.type === 'node' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    <span className="font-medium text-gray-700">Type:</span>
                    <span className="col-span-3">{(selectedElement.data as ProcessedNode).type}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <span className="font-medium text-gray-700">Name:</span>
                    <input
                      value={(selectedElement.data as ProcessedNode).properties?.name || ''}
                      onChange={e => setSelectedElement(prev => prev ? {
                        ...prev,
                        data: { ...prev.data, properties: { ...prev.data.properties, name: e.target.value } }
                      } : null)}
                      className="col-span-3 border rounded px-3 py-2 w-full"
                    />
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-800">Properties:</h4>
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
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full border-collapse">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 text-sm font-medium text-gray-600 border-b w-1/3">Property</th>
                            <th className="text-left p-3 text-sm font-medium text-gray-600 border-b w-2/3">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {Object.entries((selectedElement.data as ProcessedNode).properties)
                            .filter(([key]) => key !== 'name')
                            .map(([key, value]) => {
                              const isSystemProperty = key.startsWith('_')
                              return (
                                <tr key={key} className="border-b">
                                  <td className="p-3 align-top">
                                    <span className="inline-flex items-center">
                                      {key}
                                      {isSystemProperty && (
                                        <span className="ml-1 text-xs text-gray-500">(system)</span>
                                      )}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex gap-2">
                                      {typeof value === 'string' && value.length > 100 ? (
                                        <textarea
                                          className={`w-full min-h-[100px] rounded px-2 py-1 ${isSystemProperty ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                                          value={(selectedElement.data as ProcessedNode).properties[key] ?? ''}
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
                                          }}
                                          readOnly={isSystemProperty}
                                        />
                                      ) : (
                                        <input
                                          className={`flex-1 rounded px-2 py-1 ${isSystemProperty ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                                          value={(selectedElement.data as ProcessedNode).properties[key] ?? ''}
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
                                      )}
                                      {!isSystemProperty && (
                                        <button
                                          onClick={() => {
                                            const newProps = { ...(selectedElement.data as ProcessedNode).properties }
                                            delete newProps[key];
                                            setSelectedElement(prev => prev ? {
                                              ...prev,
                                              data: { ...prev.data, properties: newProps }
                                            } : null)
                                            updateNode((selectedElement.data as ProcessedNode).id, newProps)
                                          }}
                                          className="text-red-500 hover:text-red-700 p-1"
                                        >
                                          ×
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-2">Create Edge</h4>
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 items-center gap-2">
                        <label className="text-sm">Type:</label>
                        <input
                          className="col-span-3 border rounded px-3 py-2"
                          placeholder="Enter relationship type"
                          value={edgeFormData.type}
                          onChange={e => setEdgeFormData(prev => ({ ...prev, type: e.target.value as EdgeType }))}
                        />
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
                            addEdge(sourceNode, targetNode, edgeFormData.type, {})
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
                  <div className="grid grid-cols-4 gap-2">
                    <span className="font-medium text-gray-700">Type:</span>
                    <span className="col-span-3">{(selectedElement.data as ProcessedLink).name}</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-800">Properties:</h4>
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
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full border-collapse">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 text-sm font-medium text-gray-600 border-b w-1/3">Property</th>
                            <th className="text-left p-3 text-sm font-medium text-gray-600 border-b w-2/3">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {Object.entries((selectedElement.data as ProcessedLink).properties || {}).map(([key, value]) => {
                            const isSystemProperty = key.startsWith('_')
                            return (
                              <tr key={key} className="border-b">
                                <td className="p-3 align-top">
                                  <span className="inline-flex items-center">
                                    {key}
                                    {isSystemProperty && (
                                      <span className="ml-1 text-xs text-gray-500">(system)</span>
                                    )}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="flex gap-2">
                                    {typeof value === 'string' && value.length > 100 ? (
                                      <textarea
                                        className={`w-full min-h-[100px] rounded px-2 py-1 ${isSystemProperty ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                                        value={(selectedElement.data as ProcessedLink).properties[key] ?? ''}
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
                                        }}
                                        readOnly={isSystemProperty}
                                      />
                                    ) : (
                                      <input
                                        className={`flex-1 rounded px-2 py-1 ${isSystemProperty ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                                        value={(selectedElement.data as ProcessedLink).properties[key] ?? ''}
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
                                    )}
                                    {!isSystemProperty && (
                                      <button
                                        onClick={() => {
                                          const newProps = { ...(selectedElement.data as ProcessedLink).properties }
                                          delete newProps[key];
                                          setSelectedElement(prev => prev ? {
                                            ...prev,
                                            data: { ...prev.data, properties: newProps }
                                          } : null)
                                          updateEdge((selectedElement.data as ProcessedLink).id, newProps)
                                        }}
                                        className="text-red-500 hover:text-red-700 p-1"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
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
        <Dialog open={showNodeForm} onOpenChange={setShowNodeForm} modal={true}>
          <DialogContent className="bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle>Create New Node</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right">Type</label>
                <select
                  className="col-span-3 bg-white dark:bg-gray-700 border rounded px-2 py-1"
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
                  className="col-span-3 bg-white dark:bg-gray-700 border rounded px-2 py-1"
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
        <Dialog open={showEdgeForm} onOpenChange={setShowEdgeForm} modal={true}>
          <DialogContent className="bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle>Create New Relationship</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right">Type</label>
                <select
                  className="col-span-3 bg-white dark:bg-gray-700 border rounded px-2 py-1"
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
                  className="col-span-3 bg-white dark:bg-gray-700 border rounded px-2 py-1"
                  value={edgeFormData.targetId}
                  onChange={e => setEdgeFormData(prev => ({ ...prev, targetId: e.target.value }))}
                >
                  {graphData?.nodes.map(node => (
                    <option key={node.id} value={node.id}>{node.properties?.name || node.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => {
                addEdge(edgeFormData.sourceId!, edgeFormData.targetId!, edgeFormData.type, edgeFormData.properties)
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
      <div className="flex justify-end p-4 bg-white border-t">
        <Button onClick={() => router.push('/merge')}>
          Merge
        </Button>
      </div>
    </div>
  )
}