'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Alert } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
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
  modified: '#60a5fa', // blue-400
  deleted: '#f87171', // red-400
  unknown: '#a1a1aa', // gray-400
  final_merged: '#c084fc', // purple-400
  conflict: '#f59e0b', // amber-500
  conflict_source: '#f97316', // orange-500
  conflict_target: '#ec4899' // pink-500
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

  const [isFinalGraph, setIsFinalGraph] = useState(false)
  const [finalGraphData, setFinalGraphData] = useState<any>(null)

  useEffect(() => {
    // If we have a mergeId and no current conflict, fetch the final merged graph
    const fetchFinalGraph = async () => {
      if (!mergeId || !transformId || currentConflict || finalGraphData) return

      try {
        const response = await fetch(`/api/merge/${mergeId}/graph/${transformId}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch final graph: ${response.statusText}`)
        }
        
        const data = await response.json()
        setFinalGraphData(data)
        setIsFinalGraph(true)
      } catch (err) {
        console.error('Error fetching final graph:', err)
        toast({
          title: "Error",
          description: "Failed to load final merged graph. Please try again.",
          variant: "destructive",
        })
      }
    }

    //fetchFinalGraph()
  }, [mergeId, currentConflict, finalGraphData])

  const loading = externalLoading || dataLoading
  const error = externalError || dataError
  const graphData = finalGraphData || externalGraphData || fetchedGraphData

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const FILTER_KEYS = ['New', 'Deleted', 'Modified'] as const;
  type FilterKey = typeof FILTER_KEYS[number];
  type Filters = { [K in `show${FilterKey}`]: boolean };
  const [filters, setFilters] = useState<Filters>({
    showNew: true,
    showDeleted: false,
    showModified: true,
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
    
    console.log('Processing graph data:', graphData)
    
    const nodesMap = new Map()
    
    // First pass: Create all nodes with fixed positions in a circle layout
    const nodes = (graphData.nodes || [])
      .filter((node: any) => {
        if (!node || !node.properties) return false
        const status = isFinalGraph ? 'final_merged' : (node.properties.__status || 'new')

        // Filter based on status
        if (!filters.showNew && status === 'new') return false
        if (!filters.showDeleted && status === 'deleted') return false
        if (!filters.showModified && status === 'modified') return false

        if (searchQuery) {
          const nodeStr = JSON.stringify(node).toLowerCase()
          return nodeStr.includes(searchQuery.toLowerCase())
        }
        return true
      })
      .map((node: any, idx: number, arr: any[]) => {
        let color = isFinalGraph ? 
          COLOR_SCHEME.final_merged : 
          COLOR_SCHEME[node.properties?.__status as Status] || COLOR_SCHEME.unknown
        
        // Highlight nodes involved in current conflict
        if (!isFinalGraph && currentConflict && (
          currentConflict.nodeId === node.id ||
          currentConflict.relatedNodes?.includes(node.id)
        )) {
          color = currentConflict.source === node.id ? 
            COLOR_SCHEME.conflict_source : 
            COLOR_SCHEME.conflict_target
        }

        // Calculate fixed position in a circle layout
        const angle = (idx / arr.length) * 2 * Math.PI
        const radius = Math.sqrt(arr.length) * 50
        
        const processedNode = {
          ...node,
          color,
          displayName: node.properties?.name || node.label || node.labels?.[0] || 'Unnamed',
          val: node.properties?.__importance || 1,
          // Add fixed positions to prevent nodes from disappearing
          fx: Math.cos(angle) * radius,
          fy: Math.sin(angle) * radius,
          // Initial positions for the simulation
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        }
        nodesMap.set(node.id, processedNode)
        return processedNode
      })

    // Second pass: Create links with proper source and target references
    const links = (graphData.edges || [])
      .filter((edge: any) => {
        const sourceExists = nodesMap.has(edge.source)
        const targetExists = nodesMap.has(edge.target)
        return sourceExists && targetExists
      })
      .map((edge: any) => {
        let color = isFinalGraph ? 
          COLOR_SCHEME.final_merged : 
          COLOR_SCHEME[edge.properties?.__status as Status] || COLOR_SCHEME.unknown
        
        // Highlight edges involved in current conflict
        if (!isFinalGraph && currentConflict && currentConflict.edgeId === edge.id) {
          color = COLOR_SCHEME.conflict
        }

        return {
          ...edge,
          color,
          source: nodesMap.get(edge.source),
          target: nodesMap.get(edge.target),
          id: edge.id || `${edge.source}-${edge.target}`,
          displayName: edge.type || 'Relationship'
        }
      })

    const result = { nodes, links }
    console.log('Processed graph data:', result)
    return result
  }, [graphData, filters, searchQuery, currentConflict, isFinalGraph])

  // Add effect to stabilize graph after rendering
  useEffect(() => {
    if (fgRef.current && processedGraphData.nodes.length > 0) {
      console.log('Stabilizing graph with', processedGraphData.nodes.length, 'nodes')
      
      // Adjust forces for better stability
      fgRef.current.d3Force('link').distance(100).strength(0.5)
      fgRef.current.d3Force('charge').strength(-300)
      
      // Ensure the center force is strong enough
      if (!fgRef.current.d3Force('center')) {
        fgRef.current.d3Force('center', d3.forceCenter())
      }
      fgRef.current.d3Force('center').strength(0.1)
      
      // Reheat the simulation to ensure it runs
      fgRef.current.d3ReheatSimulation()
      
      // Set a timeout to fix positions after initial layout
      const timer = setTimeout(() => {
        if (fgRef.current) {
          console.log('Fixing node positions')
          const { nodes } = fgRef.current.graphData()
          nodes.forEach((node: any) => {
            // Keep the fixed positions
            if (!node.fx && !node.fy) {
              node.fx = node.x
              node.fy = node.y
            }
          })
          fgRef.current.refresh()
        }
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [processedGraphData])

  // Add effect to handle initial graph data
  useEffect(() => {
    if (graphData && !processedGraphData.nodes.length) {
      console.log('Initial graph data received but no processed nodes, refreshing...');
      // Force a re-render with a slight delay to ensure the component is mounted
      const timer = setTimeout(() => {
        if (containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect();
          setDimensions({ width, height });
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [graphData, processedGraphData.nodes.length]);

  // Add effect to periodically refresh the graph to prevent it from disappearing
  // useEffect(() => {
  //   if (fgRef.current && processedGraphData.nodes.length > 0) {
  //     // Set up a periodic refresh to ensure the graph stays visible
  //     const refreshInterval = setInterval(() => {
  //       if (fgRef.current) {
  //         console.log('Periodic graph refresh');
  //         fgRef.current.refresh();
  //       }
  //     }, 5000); // Refresh every 5 seconds
      
  //     return () => clearInterval(refreshInterval);
  //   }
  // }, [fgRef.current, processedGraphData.nodes.length]);

  // Function to focus on a specific node
  const focusOnNode = useCallback((nodeId: string) => {
    const node = graphDataMemo.nodes.find((n: any) => n.id === nodeId)
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
        (link: any) => (link.source as any).id === nodeId || (link.target as any).id === nodeId
      )
      const connectedNodes = new Set(connectedLinks.flatMap((link: any) => [
        (link.source as any).id,
        (link.target as any).id
      ]))
      
      setHighlightNodes(connectedNodes)
      setHighlightLinks(new Set(connectedLinks.map((link: any) => link.id)))
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
          {dimensions.width > 0 && dimensions.height > 0 && processedGraphData.nodes.length > 0 ? (
            <ForceGraph2D
              ref={fgRef}
              graphData={processedGraphData}
              width={dimensions.width}
              height={dimensions.height}
              nodeLabel="displayName"
              linkLabel="displayName"
              nodeColor={node => node.color}
              linkColor={link => link.color}
              nodeVal={node => node.val || 1}
              linkWidth={2}
              linkDirectionalParticles={4}
              linkDirectionalParticleWidth={2}
              onNodeHover={handleNodeHover}
              onLinkHover={handleLinkHover}
              onNodeClick={handleNodeClick}
              d3AlphaDecay={0.01} // Slower layout stabilization
              d3VelocityDecay={0.1} // Lower value to allow more movement
              cooldownTicks={100}
              warmupTicks={50}
              nodeCanvasObject={(node, ctx, globalScale) => {
                // Custom node rendering to ensure visibility
                const label = node.displayName;
                const fontSize = 12/globalScale;
                const nodeR = Math.sqrt(node.val || 1) * 5;
                
                // Draw node circle
                ctx.beginPath();
                ctx.arc(node.x || 0, node.y || 0, nodeR, 0, 2 * Math.PI);
                ctx.fillStyle = node.color;
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.stroke();
                
                // Draw node label if zoomed in enough
                if (globalScale > 0.8) {
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = 'black';
                  ctx.fillText(label, node.x || 0, (node.y || 0) + nodeR + fontSize);
                }
              }}
              onEngineStop={() => {
                console.log('Engine stopped, fixing positions');
                // Save final positions for smoother updates
                if (fgRef.current && fgRef.current.graphData) {
                  const { nodes } = fgRef.current.graphData();
                  nodes.forEach((node: any) => {
                    if (!node.fx && !node.fy) {
                      node.fx = node.x;
                      node.fy = node.y;
                    }
                  });
                  // Force a refresh to ensure the graph stays visible
                  setTimeout(() => {
                    if (fgRef.current) {
                      fgRef.current.refresh();
                    }
                  }, 100);
                }
              }}
              // Disable automatic cooldown to prevent the simulation from stopping
              cooldownTime={0}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              {processedGraphData.nodes.length === 0 ? (
                <div className="text-center">
                  <p>No graph data available to display.</p>
                  <p className="text-sm mt-2">Try adjusting filters or check your data source.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      refetch();
                      toast({
                        title: "Refreshing",
                        description: "Attempting to reload graph data...",
                      });
                    }}
                  >
                    Refresh Data
                  </Button>
                </div>
              ) : (
                <LoadingGraph />
              )}
            </div>
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
        {isFinalGraph && (
          <div className="absolute top-4 right-4 z-10">
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Final Merged Graph
            </Badge>
          </div>
        )}
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