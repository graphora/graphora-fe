'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Alert } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import type { GraphData } from '@/types/graph'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useGraphData } from '@/hooks/useGraphData'
import { toast } from '@/components/ui/use-toast'

interface MergeGraphVisualizationProps {
  transformId?: string
  mergeId?: string
  loading?: boolean
  error?: string | null
  currentConflict?: any
  graphData?: any
}

// Color scheme for different states
const COLOR_SCHEME = {
  new: '#4ade80', // green-400
  deleted: '#f87171', // red-400
  modified: '#60a5fa', // blue-400
  conflict: '#fbbf24', // amber-400
  unchanged: '#9ca3af', // gray-400
  unknown: '#a78bfa', // violet-400
  reference: '#22d3ee', // cyan-400
  needs_review: '#fb923c', // orange-400
  conflict_source: '#f59e0b', // amber-500
  conflict_target: '#d97706', // amber-600
  preview_add: '#86efac', // green-300
  preview_remove: '#fca5a5', // red-300
} as const

type Status = keyof typeof COLOR_SCHEME

const LoadingGraph = () => (
  <div className="w-full h-full min-h-[600px] flex items-center justify-center text-gray-400">
    <Loader2 className="h-8 w-8 animate-spin mr-2" />
    Loading graph visualization...
  </div>
)

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false, loading: () => <LoadingGraph /> }
)

export const MergeGraphVisualization = ({ 
  transformId,
  mergeId,
  loading: externalLoading,
  error: externalError,
  currentConflict,
  graphData: externalGraphData
}: MergeGraphVisualizationProps) => {
  const {
    graphData: fetchedGraphData,
    loading: dataLoading,
    error: dataError,
    refetch
  } = useGraphData({
    transformId,
    mergeId,
    enabled: !externalLoading && !externalGraphData // Only fetch if not loading externally and no external data
  })

  const loading = externalLoading || dataLoading
  const error = externalError || dataError
  const graphData = externalGraphData || fetchedGraphData

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const FILTER_KEYS = ['New', 'Deleted', 'Modified', 'Conflicts', 'Unchanged', 'Unknown', 'Reference', 'NeedsReview'] as const;
  type FilterKey = typeof FILTER_KEYS[number];
  type Filters = { [K in `show${FilterKey}`]: boolean };
  const [filters, setFilters] = useState<Filters>({
    showNew: true,
    showDeleted: true,
    showModified: true,
    showConflicts: true,
    showUnchanged: true,
    showUnknown: true,
    showReference: true,
    showNeedsReview: true,
  })

  const [showPropertiesModal, setShowPropertiesModal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewResolution, setPreviewResolution] = useState<any>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [centerCoords, setCenterCoords] = useState({ x: 0, y: 0 })
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipContent, setTooltipContent] = useState<any>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const fgRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [highlightNodes, setHighlightNodes] = useState(new Set())
  const [highlightLinks, setHighlightLinks] = useState(new Set())
  const [hoverNode, setHoverNode] = useState<any>(null)

  const graphDataMemo = useMemo(() => {
    if (!graphData?.nodes?.length) return { nodes: [], edges: [] }
    return graphData
  }, [graphData])

  // Process graph data with merge status and conflict highlighting
  const processedGraphData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] }
    
    const nodesMap = new Map()
    
    // First pass: Create all nodes
    const nodes = (graphData.nodes || [])
      .filter(node => {
        if (!node || !node.properties) return false
        const status = node.properties.__status || 'unknown'

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
        let color = COLOR_SCHEME[node.properties?.__status as Status] || COLOR_SCHEME.unknown
        
        // Highlight nodes involved in current conflict
        if (currentConflict && (
          currentConflict.nodeId === node.id ||
          currentConflict.relatedNodes?.includes(node.id)
        )) {
          color = currentConflict.source === node.id ? 
            COLOR_SCHEME.conflict_source : 
            COLOR_SCHEME.conflict_target
        }
        
        // Apply preview colors if showing resolution preview
        if (showPreview && previewResolution) {
          if (previewResolution.addedNodes?.includes(node.id)) {
            color = COLOR_SCHEME.preview_add
          } else if (previewResolution.removedNodes?.includes(node.id)) {
            color = COLOR_SCHEME.preview_remove
          }
        }

        const processedNode = {
          ...node,
          color,
          displayName: node.properties?.name || node.labels?.[0] || 'Unnamed',
          val: node.properties?.__importance || 1, // Node size based on importance
        }
        nodesMap.set(node.id, processedNode)
        return processedNode
      })

    // Second pass: Create links
    const links = (graphData.edges || [])
      .filter(edge => {
        // Only keep edges where both source and target are node IDs that exist in our nodes
        const sourceExists = nodesMap.has(edge.source)
        const targetExists = nodesMap.has(edge.target)
        return sourceExists && targetExists
      })
      .map(edge => {
        let color = COLOR_SCHEME[edge.properties?.__status as Status] || COLOR_SCHEME.unknown
        
        // Highlight edges involved in current conflict
        if (currentConflict && currentConflict.edgeId === edge.id) {
          color = COLOR_SCHEME.conflict
        }
        
        // Apply preview colors if showing resolution preview
        if (showPreview && previewResolution) {
          if (previewResolution.addedEdges?.includes(edge.id)) {
            color = COLOR_SCHEME.preview_add
          } else if (previewResolution.removedEdges?.includes(edge.id)) {
            color = COLOR_SCHEME.preview_remove
          }
        }

        return {
          ...edge,
          id: `${edge.source}-${edge.target}`,
          source: nodesMap.get(edge.source),
          target: nodesMap.get(edge.target),
          color,
          type: edge.type,
          displayName: edge.type?.replace(/_/g, ' ').toLowerCase() || 'related',
          curvature: 0.2 // Add slight curve to edges for better visibility
        }
      })

    return { nodes, links }
  }, [graphData, filters, searchQuery, currentConflict, showPreview, previewResolution])

  // Function to focus on a specific node
  const focusOnNode = useCallback((nodeId: string) => {
    const node = graphDataMemo.nodes.find(n => n.id === nodeId)
    if (node && fgRef.current) {
      const distance = 200
      const angle = Math.random() * 2 * Math.PI
      
      // Position camera to focus on node
      fgRef.current.centerAt(
        node.x || Math.cos(angle) * distance,
        node.y || Math.sin(angle) * distance,
        1000 // transition duration
      )
      fgRef.current.zoom(2, 1000) // zoom level and duration
      
      // Highlight the node and its connections
      const connectedLinks = processedGraphData.links.filter(
        link => (link.source as any).id === nodeId || (link.target as any).id === nodeId
      )
      const connectedNodes = new Set(connectedLinks.flatMap(link => [
        (link.source as any).id,
        (link.target as any).id
      ]))
      
      setHighlightNodes(connectedNodes)
      setHighlightLinks(new Set(connectedLinks.map(link => link.id)))
    }
  }, [graphDataMemo, processedGraphData])

  // Effect to focus on current conflict
  useEffect(() => {
    if (currentConflict?.nodeId) {
      focusOnNode(currentConflict.nodeId)
    }
  }, [currentConflict, focusOnNode])

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

  // Add conflict detail fetching
  const fetchConflictDetail = useCallback(async (conflictId: string) => {
    if (!mergeId) return

    try {
      const response = await fetch(`/api/merge/${mergeId}/conflicts/${conflictId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch conflict detail: ${response.status}`)
      }

      const data = await response.json()
      setPreviewResolution(data.resolution)
      setShowPreview(true)
    } catch (error) {
      console.error('Error fetching conflict detail:', error)
      toast({
        title: "Error",
        description: "Failed to fetch conflict details",
        variant: "destructive",
      })
    }
  }, [mergeId])

  // Update node click handler to fetch conflict details if available
  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node)
    setShowPropertiesModal(true)

    // If node has conflicts and we're in merge mode, fetch conflict details
    if (mergeId && node.conflicts?.length > 0) {
      fetchConflictDetail(node.conflicts[0].id)
    }
  }, [mergeId, fetchConflictDetail])

  // Handle node hover
  const handleNodeHover = useCallback((node: any) => {
    if (node) {
      setShowTooltip(true)
      setTooltipContent({
        type: 'node',
        data: node
      })
      setTooltipPosition({
        x: node.x,
        y: node.y
      })
    } else {
      setShowTooltip(false)
    }
  }, [])

  // Handle link hover
  const handleLinkHover = useCallback((link: any) => {
    if (link) {
      setShowTooltip(true)
      setTooltipContent({
        type: 'link',
        data: link
      })
      setTooltipPosition({
        x: (link.source.x + link.target.x) / 2,
        y: (link.source.y + link.target.y) / 2
      })
    } else {
      setShowTooltip(false)
    }
  }, [])

  // Show loading state
  if (loading) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading graph data...</p>
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
      {/* Controls Panel */}
      <div className="w-48 p-4 bg-white border-r border-gray-200 shrink-0 flex flex-col gap-4">
        {/* Search */}
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

        {/* Status Filter */}
        <div>
          <h3 className="font-medium mb-2">Status Filter</h3>
          <div className="space-y-2">
            {Object.entries(COLOR_SCHEME).map(([status, color]) => (
              <div key={status} className="flex items-center">
                <Switch
                  checked={filters[`show${status.charAt(0).toUpperCase() + status.slice(1)}` as keyof Filters]}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ 
                      ...prev, 
                      [`show${status.charAt(0).toUpperCase() + status.slice(1)}` as keyof Filters]: checked 
                    }))
                  }
                  style={{ 
                    backgroundColor: filters[`show${status.charAt(0).toUpperCase() + status.slice(1)}` as keyof Filters] ? color : '#e5e7eb'
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

        {/* Preview Controls */}
        {currentConflict && (
          <div>
            <h3 className="font-medium mb-2">Resolution Preview</h3>
            <Switch
              checked={showPreview}
              onCheckedChange={setShowPreview}
              className="mr-2"
            />
            <span>Show preview</span>
          </div>
        )}

        {/* Zoom Controls */}
        <div>
          <h3 className="font-medium mb-2">View Controls</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                if (fgRef.current) {
                  fgRef.current.zoomTo(zoomLevel + 0.5, 400)
                  setZoomLevel(prev => prev + 0.5)
                }
              }}
            >
              Zoom In
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                if (fgRef.current) {
                  fgRef.current.zoomTo(zoomLevel - 0.5, 400)
                  setZoomLevel(prev => prev - 0.5)
                }
              }}
            >
              Zoom Out
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                if (fgRef.current) {
                  fgRef.current.zoomTo(1, 400)
                  setZoomLevel(1)
                  fgRef.current.centerAt(0, 0, 400)
                  setCenterCoords({ x: 0, y: 0 })
                }
              }}
            >
              Reset View
            </Button>
          </div>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0">
          {dimensions.width > 0 && dimensions.height > 0 && (
            <ForceGraph2D
              ref={fgRef}
              graphData={processedGraphData}
              width={dimensions.width}
              height={dimensions.height}
              nodeLabel="displayName"
              linkLabel="displayName"
              nodeColor={node => node.color}
              linkColor={link => link.color}
              nodeVal={node => node.val}
              linkWidth={2}
              linkDirectionalParticles={4}
              linkDirectionalParticleWidth={2}
              onNodeHover={handleNodeHover}
              onLinkHover={handleLinkHover}
              onNodeClick={handleNodeClick}
              d3AlphaDecay={0.02} // Slower layout stabilization
              d3VelocityDecay={0.3}
              cooldownTicks={100}
              onEngineStop={() => {
                // Save final positions for smoother updates
                if (fgRef.current) {
                  const { nodes } = fgRef.current.graphData()
                  nodes.forEach((node: any) => {
                    node.fx = node.x
                    node.fy = node.y
                  })
                }
              }}
            />
          )}

          {/* Tooltip */}
          {showTooltip && tooltipContent && (
            <div
              className="absolute bg-white p-2 rounded shadow-lg text-sm"
              style={{
                left: tooltipPosition.x + dimensions.width / 2,
                top: tooltipPosition.y + dimensions.height / 2,
                transform: 'translate(-50%, -100%)',
                pointerEvents: 'none',
                zIndex: 1000
              }}
            >
              {tooltipContent.type === 'node' ? (
                <div>
                  <div className="font-medium">{tooltipContent.data.displayName}</div>
                  <div className="text-gray-500">Type: {tooltipContent.data.type}</div>
                  {tooltipContent.data.properties?.__status && (
                    <div className="text-gray-500">
                      Status: {tooltipContent.data.properties.__status}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="font-medium">{tooltipContent.data.displayName}</div>
                  <div className="text-gray-500">
                    {tooltipContent.data.source.displayName} →{' '}
                    {tooltipContent.data.target.displayName}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Node Properties Modal */}
      <Dialog open={showPropertiesModal} onOpenChange={setShowPropertiesModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Node Properties</DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <div className="text-sm">{selectedNode.displayName}</div>
              </div>
              <div>
                <Label>Type</Label>
                <div className="text-sm">{selectedNode.type}</div>
              </div>
              <div>
                <Label>Properties</Label>
                <pre className="text-sm bg-gray-50 p-2 rounded">
                  {JSON.stringify(selectedNode.properties, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}