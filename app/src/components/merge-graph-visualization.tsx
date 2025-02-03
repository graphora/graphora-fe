'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Alert } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMergeVisualization } from '@/hooks/useMergeVisualization'
import { MergeWebSocket } from '@/lib/merge-websocket'
import type { GraphData } from '@/types/graph'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface MergeGraphVisualizationProps {
  sessionId: string
  wsInstance: MergeWebSocket | null
  graphData: GraphData
}

// Color scheme for different states
const COLOR_SCHEME = {
  new: '#4ade80', // green-400
  deleted: '#f87171', // red-400
  modified: '#60a5fa', // blue-400
  conflict: '#fbbf24', // amber-400
  unchanged: '#9ca3af', // gray-400
  unknown: '#a78bfa', // violet-400
  // reference: '#22d3ee', // cyan-400
  needs_review: '#fb923c', // orange-400
} as const

type Status = keyof typeof COLOR_SCHEME

const LoadingGraph = () => (
  <div className="w-full h-full min-h-[600px] flex items-center justify-center text-gray-400">
    Loading graph visualization...
  </div>
)

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false, loading: () => <LoadingGraph /> }
)

export const MergeGraphVisualization = ({ sessionId, wsInstance, graphData }: MergeGraphVisualizationProps) => {
  const { 
    loading,
    error,
    wsConnected,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    updateEdge,
    deleteEdge,
  } = useMergeVisualization(sessionId, wsInstance)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [filters, setFilters] = useState({
    showNew: true,
    showDeleted: true,
    showModified: true,
    showConflicts: true,
    showUnchanged: true,
    showUnknown: true,
    showReference: true,
    showNeedsReview: true
  })

  const [showPropertiesModal, setShowPropertiesModal] = useState(false)

  const fgRef = useRef<any>()
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [highlightNodes, setHighlightNodes] = useState(new Set())
  const [highlightLinks, setHighlightLinks] = useState(new Set())
  const [hoverNode, setHoverNode] = useState<any>(null)

  const graphDataMemo = useMemo(() => {
    if (!graphData?.nodes?.length) return { nodes: [], edges: [] }
    return graphData
  }, [graphData])

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
    if (fgRef.current && graphDataMemo.nodes.length > 0) {
      fgRef.current.d3Force('link').distance(100)
      fgRef.current.d3Force('charge').strength(-200)
      fgRef.current.zoom(2)
      fgRef.current.centerAt(0, 0)
    }
  }, [graphDataMemo])

  // Process graph data with merge status
  const processedGraphData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] }
    console.log('Raw graph data in visualization:', graphData)

    const nodesMap = new Map()
    
    // First pass: Create all nodes
    const nodes = (graphData.nodes || [])
      .filter(node => {
        if (!node || !node.properties) return false
        const status = node.properties.__status || node.status || 'unknown'

        // Filter based on status
        if (!filters.showNew && status === 'new') return false
        if (!filters.showDeleted && status === 'deleted') return false
        if (!filters.showModified && status === 'modified') return false
        if (!filters.showConflicts && status === 'conflict') return false
        if (!filters.showUnchanged && status === 'unchanged') return false
        if (!filters.showUnknown && status === 'unknown') return false
        if (!filters.showReference && status === 'reference') return false
        if (!filters.showNeedsReview && status === 'needs_review') return false

        if (searchQuery) {
          const nodeStr = JSON.stringify(node).toLowerCase()
          return nodeStr.includes(searchQuery.toLowerCase())
        }
        return true
      })
      .map(node => {
        const status = (node.properties.__status || node.status || 'unknown') as Status
        const color = COLOR_SCHEME[status] || COLOR_SCHEME.unknown

        const processedNode = {
          ...node,
          color,
          displayName: node.properties?.name || node.labels?.[0] || 'Unnamed'
        }
        nodesMap.set(node.id, processedNode)
        return processedNode
      })

    // Second pass: Create links from edges that have valid source and target nodes
    const links = (graphData.edges || [])
      .filter(edge => {
        // Only keep edges where both source and target are node IDs that exist in our nodes
        const sourceExists = nodesMap.has(edge.source)
        const targetExists = nodesMap.has(edge.target)
        return sourceExists && targetExists
      })
      .map(edge => {
        const sourceNode = nodesMap.get(edge.source)
        const targetNode = nodesMap.get(edge.target)
        
        const status = (edge.properties?.__status || edge.status || 'unknown') as Status
        const color = COLOR_SCHEME[status] || COLOR_SCHEME.unknown
        
        return {
          id: `${edge.source}-${edge.target}`,
          source: sourceNode,
          target: targetNode,
          color,
          type: edge.type,
          displayName: edge.type?.replace(/_/g, ' ').toLowerCase() || 'related'
        }
      })

    console.log('Processed nodes:', nodes.length, 'links:', links.length)
    return { nodes, links }
  }, [graphData, filters, searchQuery])

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node)
    setShowPropertiesModal(true)
  }, [])

  // Show loading state
  if (loading || !wsConnected) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>{!wsConnected ? 'Connecting...' : 'Loading graph data...'}</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center">
        <Alert variant="destructive" className="w-96">
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2">
            <h4 className="font-medium">Error</h4>
            <p className="text-sm">{error}</p>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full">
      {/* Legend */}
      <div className="w-48 p-4 bg-white border-r border-gray-200 shrink-0">
        <div>
          <h3 className="font-medium mb-2">Search</h3>
          <Input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="mt-4">
          <h3 className="font-medium mb-2">Status Filter</h3>
          <div className="space-y-2">
            {Object.entries(COLOR_SCHEME).map(([status, color]) => (
              <div key={status} className="flex items-center">
                <Switch
                  checked={filters[`show${status.charAt(0).toUpperCase() + status.slice(1)}`]}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ 
                      ...prev, 
                      [`show${status.charAt(0).toUpperCase() + status.slice(1)}`]: checked 
                    }))
                  }
                  style={{ 
                    backgroundColor: filters[`show${status.charAt(0).toUpperCase() + status.slice(1)}`] ? color : '#e5e7eb'
                  }}
                  className="mr-2"
                />
                <span className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }} />
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0">
          {dimensions.width > 0 && dimensions.height > 0 && (
            <ForceGraph2D
              ref={fgRef}
              width={dimensions.width + 200}
              height={dimensions.height + 200}
              graphData={processedGraphData}
              nodeLabel={(node: any) => node.displayName}
              linkLabel={(link: any) => link.displayName}
              nodeColor={(node: any) => node.color}
              nodeVal={8} // Smaller base size
              linkWidth={1} // Thinner links
              linkColor={(link: any) => link.color || '#999'}
              d3AlphaDecay={0.01}
              d3VelocityDecay={0.4}
              cooldownTime={200}
              d3Force="link"
              linkDistance={200} // Increased distance between nodes
              d3ForceStrength={-2000} // Much stronger repulsion
              onEngineStop={() => {
                // Remove auto-zoom after engine stop to prevent zoom changes after drag
                // if (fgRef.current) {
                //   fgRef.current.zoomToFit(400, 50)
                // }
              }}
              onNodeDragEnd={node => {
                node.fx = node.x
                node.fy = node.y
              }}
              onNodeClick={handleNodeClick}
              enableNodeDrag={true}
              enableZoomInteraction={true}
              enablePanInteraction={true}
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const label = node.displayName
                const fontSize = Math.min(14, 10/globalScale)
                const size = Math.min(10, 12/globalScale)
                
                // Draw node circle
                ctx.fillStyle = node.color
                ctx.beginPath()
                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
                ctx.fill()
                
                // Draw white border for better visibility
                ctx.strokeStyle = '#ffffff'
                ctx.lineWidth = Math.min(1.5, 1/globalScale)
                ctx.stroke()
                
                // Only render labels if zoomed in enough
                if (globalScale > 0.4) {
                  ctx.font = `${fontSize}px Arial`
                  ctx.textAlign = 'center'
                  ctx.textBaseline = 'middle'
                  
                  ctx.strokeStyle = 'transparent'
                  ctx.lineWidth = 2
                  ctx.strokeText(label, node.x, node.y + size + 4)
                  ctx.fillStyle = '#000000'
                  ctx.fillText(label, node.x, node.y + size + 4)
                }
              }}
              linkCanvasObject={(link: any, ctx, globalScale) => {
                const start = link.source
                const end = link.target
                
                const dx = end.x - start.x
                const dy = end.y - start.y
                const length = Math.sqrt(dx * dx + dy * dy)
                
                if (length === 0) return
                
                const unitDx = dx / length
                const unitDy = dy / length
                
                // Get the radius of the target node for arrow placement
                const nodeSize = Math.min(10, 12/globalScale)
                
                // Place arrow head just outside the node
                const arrowLength = Math.min(4, length/8)
                const arrowWidth = arrowLength * 0.3
                
                // Move arrow start point outside the node
                const arrowX = end.x - unitDx * (nodeSize + arrowLength)
                const arrowY = end.y - unitDy * (nodeSize + arrowLength)
                
                const perpX = -unitDy
                const perpY = unitDx
                
                const leftX = arrowX - arrowWidth * perpX
                const leftY = arrowY - arrowWidth * perpY
                const rightX = arrowX + arrowWidth * perpX
                const rightY = arrowY + arrowWidth * perpY
                
                // Draw line to the edge of the node
                ctx.strokeStyle = link.color
                ctx.lineWidth = Math.min(1.5, 1.3/globalScale)
                ctx.beginPath()
                ctx.moveTo(start.x, start.y)
                ctx.lineTo(end.x - unitDx * nodeSize, end.y - unitDy * nodeSize)
                ctx.stroke()
                
                // Draw arrow
                ctx.fillStyle = link.color
                ctx.beginPath()
                ctx.moveTo(end.x - unitDx * nodeSize, end.y - unitDy * nodeSize)
                ctx.lineTo(leftX, leftY)
                ctx.lineTo(rightX, rightY)
                ctx.closePath()
                ctx.fill()
                
                // Only show labels when zoomed in
                if (globalScale > 0.4) {
                  const fontSize = Math.min(12, 8/globalScale)
                  ctx.font = `${fontSize}px Arial`
                  ctx.textAlign = 'center'
                  ctx.textBaseline = 'middle'
                  
                  const midX = (start.x + end.x) / 2
                  const midY = (start.y + end.y) / 2
                  
                  ctx.strokeStyle = '#ffffff'
                  ctx.lineWidth = 2
                  ctx.strokeText(link.displayName, midX, midY)
                  ctx.fillStyle = '#000000'
                  ctx.fillText(link.displayName, midX, midY)
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Properties Modal */}
      <Dialog open={showPropertiesModal} onOpenChange={setShowPropertiesModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Node Properties</DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <div className="space-y-4">
              <div>
                <Label>ID</Label>
                <div className="text-sm font-mono bg-gray-100 p-2 rounded">{selectedNode.id}</div>
              </div>
              <div>
                <Label>Labels</Label>
                <div className="flex gap-1 flex-wrap">
                  {selectedNode.labels.map((label: string) => (
                    <Badge key={label} variant="outline">{label}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>Properties</Label>
                <div className="space-y-2">
                  {Object.entries(selectedNode.properties || {}).map(([key, value]) => {
                    if (key.startsWith('__')) return null
                    return (
                      <div key={key} className="bg-gray-50 p-3 rounded">
                        <Label>{key}</Label>
                        <div className="text-sm mt-1 whitespace-pre-wrap font-mono">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {selectedNode.properties?.__conflicts?.length > 0 && (
                <div>
                  <Label className="text-purple-500">Conflicts</Label>
                  <div className="space-y-2">
                    {selectedNode.properties.__conflicts.map((conflict: any, i: number) => (
                      <div key={i} className="bg-purple-50 p-3 rounded space-y-2">
                        <div className="text-sm font-medium text-purple-700">
                          {conflict.type}: {conflict.description}
                        </div>
                        {conflict.properties && (
                          <div className="pl-2 space-y-2">
                            {Object.entries(conflict.properties).map(([prop, values]: [string, any]) => (
                              <div key={prop} className="bg-white p-2 rounded">
                                <div className="font-medium text-sm">{prop}:</div>
                                <div className="pl-2 mt-1 space-y-1">
                                  {Object.entries(values).map(([env, val]: [string, any]) => (
                                    <div key={env} className="text-sm">
                                      <span className="font-mono">{env}:</span> {String(val)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
