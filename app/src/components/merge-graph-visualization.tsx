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
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { useMergeVisualization } from '@/hooks/useMergeVisualization'
import { MergeWebSocket } from '@/lib/merge-websocket'
import type { GraphData } from '@/types/graph'

interface MergeGraphVisualizationProps {
  sessionId: string
  wsInstance: MergeWebSocket | null
  graphData: GraphData
}

// Color scheme for different states
const COLOR_SCHEME = {
  new: '#22c55e',      // Green
  deleted: '#ef4444',  // Red
  unchanged: '#64748b', // Slate
  modified: '#f59e0b',  // Amber
  conflict: '#7a0bc0'  // Purple
}

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
    showUnchanged: true
  })

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
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect()
      setDimensions({ width, height })
    }
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
        const status = node.status
        const type = node.type

        // Filter based on status and type
        if (!filters.showNew && status === 'new' && type === 'staging') return false
        if (!filters.showDeleted && status === 'deleted') return false
        if (!filters.showModified && status === 'needs_review') return false
        if (!filters.showUnchanged && status === 'existing') return false

        if (searchQuery) {
          const nodeStr = JSON.stringify(node).toLowerCase()
          return nodeStr.includes(searchQuery.toLowerCase())
        }
        return true
      })
      .map(node => {
        const status = node.status
        const type = node.type
        let color = COLOR_SCHEME.unchanged
        let indicator = ''

        if (type === 'staging' && status === 'new') {
          color = COLOR_SCHEME.new
          indicator = '(New)'
        } else if (status === 'deleted') {
          color = COLOR_SCHEME.deleted
          indicator = '(Deleted)'
        } else if (status === 'needs_review') {
          if (node.conflicts?.length > 0) {
            color = COLOR_SCHEME.conflict
            indicator = '(Conflict)'
          } else {
            color = COLOR_SCHEME.modified
            indicator = '(Modified)'
          }
        }

        const processedNode = {
          ...node,
          color,
          indicator
        }
        nodesMap.set(node.id, processedNode)
        return processedNode
      })

    console.log('Processed nodes:', nodes.length, nodesMap)

    // Second pass: Create links ensuring nodes exist
    const links = (graphData.edges || [])
      .filter(edge => {
        return nodesMap.has(edge.source) && nodesMap.has(edge.target)
      })
      .map(edge => ({
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        color: edge.confidence < 0.7 ? COLOR_SCHEME.conflict : COLOR_SCHEME.unchanged,
        type: edge.type
      }))

    console.log('Processed links:', links.length)
    return { nodes, links }
  }, [graphData, filters, searchQuery])

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node)
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
    <div className="flex h-full">
      {/* Control Panel */}
      <div className="w-64 border-r p-4 flex flex-col gap-4">
        <div>
          <h3 className="font-medium mb-2">Search</h3>
          <Input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div>
          <h3 className="font-medium mb-2">Filters</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-new">
                <Badge className="bg-green-500">New (+)</Badge>
              </Label>
              <Switch
                id="show-new"
                checked={filters.showNew}
                onCheckedChange={(checked) => setFilters(f => ({ ...f, showNew: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-deleted">
                <Badge className="bg-red-500">Deleted (-)</Badge>
              </Label>
              <Switch
                id="show-deleted"
                checked={filters.showDeleted}
                onCheckedChange={(checked) => setFilters(f => ({ ...f, showDeleted: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-modified">
                <Badge className="bg-orange-500">Modified (✎)</Badge>
              </Label>
              <Switch
                id="show-modified"
                checked={filters.showModified}
                onCheckedChange={(checked) => setFilters(f => ({ ...f, showModified: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-conflicts">
                <Badge className="bg-purple-500">Conflicts (⚠️)</Badge>
              </Label>
              <Switch
                id="show-conflicts"
                checked={filters.showConflicts}
                onCheckedChange={(checked) => setFilters(f => ({ ...f, showConflicts: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-unchanged">
                <Badge className="bg-slate-500">Unchanged</Badge>
              </Label>
              <Switch
                id="show-unchanged"
                checked={filters.showUnchanged}
                onCheckedChange={(checked) => setFilters(f => ({ ...f, showUnchanged: checked }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={70}>
            <div ref={containerRef} className="h-full w-full relative" style={{ minHeight: '600px' }}>
              {dimensions.width > 0 && dimensions.height > 0 && (
                <ForceGraph2D
                  ref={fgRef}
                  width={dimensions.width}
                  height={dimensions.height}
                  graphData={processedGraphData}
                  nodeLabel={(node: any) => `${node.labels.join(', ')}\n${node.indicator || ''}`}
                  nodeColor={(node: any) => node.color}
                  nodeVal={5}
                  linkWidth={2}
                  linkColor={(link: any) => link.color || '#999'}
                  d3AlphaDecay={0.02}
                  d3VelocityDecay={0.3}
                  cooldownTime={3000}
                  onEngineStop={() => {
                    if (fgRef.current) {
                      fgRef.current.zoomToFit(400, 50)
                    }
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
                    const label = node.labels[0] || ''
                    const fontSize = Math.max(12, 16/globalScale)
                    const size = 5 * Math.max(1, 1/globalScale)
                    
                    // Draw node circle
                    ctx.fillStyle = node.color
                    ctx.beginPath()
                    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
                    ctx.fill()
                    
                    // Draw indicator with better positioning
                    if (node.indicator) {
                      ctx.fillStyle = '#fff'
                      ctx.font = `${fontSize}px Sans-Serif`
                      ctx.textAlign = 'center'
                      ctx.fillText(node.indicator, node.x, node.y - size - 4)
                    }
                    
                    // Draw label with better visibility
                    ctx.fillStyle = node.color
                    ctx.font = `${fontSize}px Sans-Serif`
                    ctx.textAlign = 'center'
                    ctx.fillText(label, node.x, node.y + size + fontSize)
                  }}
                  linkCurvature={0.25}
                />
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Property Panel */}
          <ResizablePanel defaultSize={30}>
            <div className="h-full p-4">
              {selectedNode ? (
                <div className="space-y-4">
                  <h3 className="font-medium">Node Details</h3>
                  <div>
                    <Label>ID</Label>
                    <div className="text-sm">{selectedNode.id}</div>
                  </div>
                  <div>
                    <Label>Labels</Label>
                    <div className="flex gap-1 flex-wrap">
                      {selectedNode.labels.map((label: string) => (
                        <Badge key={label}>{label}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Properties</Label>
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                      {Object.entries(selectedNode.properties || {}).map(([key, value]) => {
                        if (key.startsWith('__')) return null
                        return (
                          <div key={key} className="py-1">
                            <Label>{key}</Label>
                            <div className="text-sm">{String(value)}</div>
                          </div>
                        )
                      })}
                    </ScrollArea>
                  </div>
                  {selectedNode.properties?.__conflicts?.length > 0 && (
                    <div>
                      <Label className="text-purple-500">Conflicts</Label>
                      <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                        {selectedNode.properties.__conflicts.map((conflict: string, i: number) => (
                          <div key={i} className="py-1 text-sm text-purple-500">
                            {conflict}
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400 text-center mt-8">
                  Select a node to view details
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
