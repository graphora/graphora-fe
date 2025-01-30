'use client'

import { useState, useCallback, useMemo } from 'react'
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
  modified: '#f59e0b'  // Amber
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

  // Process graph data with merge status
  const processedGraphData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] }

    const nodes = graphData.nodes
      .filter(node => {
        const status = node.properties?.__status
        const hasConflicts = node.properties?.__conflicts?.length > 0
        
        if (!filters.showUnchanged && status === 'both' && !hasConflicts) return false
        if (!filters.showNew && status === 'staging') return false
        if (!filters.showDeleted && status === 'prod') return false
        if (!filters.showModified && status === 'both' && node.properties?.__modified) return false
        if (!filters.showConflicts && hasConflicts) return false
        
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase()
          return (
            node.id.toLowerCase().includes(searchLower) ||
            node.labels.some(label => label.toLowerCase().includes(searchLower)) ||
            Object.entries(node.properties || {}).some(
              ([key, value]) => 
                !key.startsWith('__') && 
                String(value).toLowerCase().includes(searchLower)
            )
          )
        }
        
        return true
      })
      .map(node => {
        const status = node.properties?.__status
        const hasConflicts = node.properties?.__conflicts?.length > 0
        const isModified = status === 'both' && node.properties?.__modified
        
        let color = COLOR_SCHEME.unchanged
        let indicator = ''
        
        if (hasConflicts) {
          color = COLOR_SCHEME.conflict
          indicator = '⚠️'
        } else if (status === 'staging') {
          color = COLOR_SCHEME.new
          indicator = '+'
        } else if (status === 'prod') {
          color = COLOR_SCHEME.deleted
          indicator = '-'
        } else if (isModified) {
          color = COLOR_SCHEME.modified
          indicator = '✎'
        }
        
        return {
          ...node,
          color,
          indicator
        }
      })

    const links = graphData.edges
      .filter(edge => {
        const status = edge.properties?.__status
        if (!filters.showUnchanged && status === 'both') return false
        if (!filters.showNew && status === 'staging') return false
        if (!filters.showDeleted && status === 'prod') return false
        return true
      })
      .map(edge => {
        const status = edge.properties?.__status
        let color = COLOR_SCHEME.unchanged
        
        if (status === 'staging') {
          color = COLOR_SCHEME.new
        } else if (status === 'prod') {
          color = COLOR_SCHEME.deleted
        }
        
        return {
          source: edge.source,
          target: edge.target,
          id: edge.id,
          color,
          properties: edge.properties
        }
      })

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
            <div className="h-full">
              <ForceGraph2D
                graphData={processedGraphData}
                nodeLabel={(node: any) => `${node.labels.join(', ')}\n${node.indicator || ''}`}
                nodeColor={(node: any) => node.color}
                linkColor={(link: any) => link.color}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2}
                onNodeClick={handleNodeClick}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  const label = node.labels[0] || ''
                  const fontSize = 12/globalScale
                  ctx.font = `${fontSize}px Sans-Serif`
                  ctx.fillStyle = node.color
                  ctx.beginPath()
                  ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI)
                  ctx.fill()
                  
                  // Draw indicator
                  if (node.indicator) {
                    ctx.fillStyle = '#fff'
                    ctx.fillText(node.indicator, node.x + 8, node.y - 8)
                  }
                  
                  // Draw label
                  ctx.fillStyle = node.color
                  ctx.textAlign = 'center'
                  ctx.fillText(label, node.x, node.y + 15)
                }}
              />
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
