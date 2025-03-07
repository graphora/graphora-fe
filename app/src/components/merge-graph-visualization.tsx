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
import { forceCenter, forceLink, forceManyBody } from 'd3-force'
import * as d3 from 'd3'

const stringToColor = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase()
  return '#' + '00000'.substring(0, 6 - c.length) + c
}

const SPECIAL_COLORS = {
  conflict: '#f59e0b',
  conflict_source: '#f97316',
  conflict_target: '#ec4899',
  default: '#6b7280'
} as const

const LoadingGraph = () => (
  <div className="w-full h-full min-h-[600px] flex items-center justify-center text-gray-400">
    <Loader2 className="h-8 w-8 animate-spin mr-2" />
    Loading graph visualization...
  </div>
)

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false, loading: () => <LoadingGraph /> }
)

interface MergeGraphVisualizationProps {
  transformId?: string
  mergeId?: string
  loading?: boolean
  error?: string | null
  currentConflict?: any
  graphData?: any
}

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
    enabled: !externalLoading && !externalGraphData
  })

  const [isFinalGraph, setIsFinalGraph] = useState(false)
  const [finalGraphData, setFinalGraphData] = useState<any>(null)

  const loading = externalLoading || dataLoading
  const error = externalError || dataError
  const graphData = finalGraphData || externalGraphData || fetchedGraphData

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [availableTypes, setAvailableTypes] = useState<string[]>([])
  const [filters, setFilters] = useState<Record<string, boolean>>({})
  const [typeColors, setTypeColors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (graphData?.nodes) {
      const types = Array.from(
        new Set(graphData.nodes.map((node: any) => node.type || node.label || 'default'))
      )
      setAvailableTypes(types)

      const newTypeColors = types.reduce((acc, type) => ({
        ...acc,
        [type]: stringToColor(type)
      }), SPECIAL_COLORS)
      setTypeColors(newTypeColors)

      const newFilters = types.reduce((acc, type) => ({
        ...acc,
        [`show${type}`]: true
      }), {})
      setFilters(newFilters)
    }
  }, [graphData])

  const [showPropertiesModal, setShowPropertiesModal] = useState(false)
  const fgRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  const graphDataMemo = useMemo(() => {
    if (!graphData?.nodes?.length) return { nodes: [], edges: [] }
    return graphData
  }, [graphData])

  const processedGraphData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] }

    const nodesMap = new Map()

    const nodes = (graphData.nodes || [])
      .filter((node: any) => {
        if (!node) return false
        const nodeType = node.type || node.label || 'default'
        if (!filters[`show${nodeType}`]) return false

        if (searchQuery) {
          const nodeStr = JSON.stringify(node).toLowerCase()
          return nodeStr.includes(searchQuery.toLowerCase())
        }
        return true
      })
      .map((node: any, idx: number, arr: any[]) => {
        const nodeType = node.type || node.label || 'default'
        let color = typeColors[nodeType] || SPECIAL_COLORS.default
        
        if (!isFinalGraph && currentConflict) {
          if (currentConflict.nodeId === node.id || 
              currentConflict.relatedNodes?.includes(node.id)) {
            color = currentConflict.source === node.id ? 
              SPECIAL_COLORS.conflict_source : 
              SPECIAL_COLORS.conflict_target
          }
        }

        const angle = (idx / arr.length) * 2 * Math.PI
        const radius = Math.sqrt(arr.length) * 50
        
        const processedNode = {
          ...node,
          color,
          displayName: node.properties?.name || node.label || node.type || 'Unnamed',
          val: node.properties?.__importance || 1,
          fx: Math.cos(angle) * radius,
          fy: Math.sin(angle) * radius,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        }
        nodesMap.set(node.id, processedNode)
        return processedNode
      })

    const links = (graphData.edges || [])
      .filter((edge: any) => {
        const sourceExists = nodesMap.has(edge.source)
        const targetExists = nodesMap.has(edge.target)
        return sourceExists && targetExists
      })
      .map((edge: any) => {
        let color = SPECIAL_COLORS.default
        if (!isFinalGraph && currentConflict && currentConflict.edgeId === edge.id) {
          color = SPECIAL_COLORS.conflict
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

    return { nodes, links }
  }, [graphData, filters, searchQuery, currentConflict, isFinalGraph, typeColors])

  // Define forces as props instead of modifying them in useEffect
  const linkForce = useMemo(() => forceLink().distance(100).strength(0.5), [])
  const chargeForce = useMemo(() => forceManyBody().strength(-300), [])
  const centerForce = useMemo(() => forceCenter(0, 0).strength(0.1), [])

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

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node)
    setShowPropertiesModal(true)
  }, [])

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
      <div className="w-48 p-4 bg-white border-r border-gray-200 shrink-0 flex flex-col gap-4">
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

        <div>
          <h3 className="font-medium mb-2">Type Filter</h3>
          <div className="space-y-2">
            {availableTypes.map((type) => (
              <div key={type} className="flex items-center">
                <Switch
                  checked={filters[`show${type}`]}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, [`show${type}`]: checked }))
                  }
                  style={{ 
                    backgroundColor: filters[`show${type}`] ? typeColors[type] : '#e5e7eb'
                  }}
                  className="mr-2"
                />
                <span className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: typeColors[type] }} 
                  />
                  {type}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">View Controls</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fgRef.current?.zoom(fgRef.current.zoom() + 0.5, 400)}
            >
              Zoom In
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fgRef.current?.zoom(fgRef.current.zoom() - 0.5, 400)}
            >
              Zoom Out
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                if (fgRef.current) {
                  fgRef.current.zoom(1, 400)
                  fgRef.current.centerAt(0, 0, 400)
                }
              }}
            >
              Reset View
            </Button>
          </div>
        </div>
      </div>

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
              linkWidth={1}
              linkDirectionalParticles={4}
              linkDirectionalParticleWidth={2}
              onNodeClick={handleNodeClick}
              d3AlphaDecay={0.01}
              d3VelocityDecay={0.1}
              cooldownTicks={100}
              warmupTicks={50}
              // Configure forces via props
              linkForce={linkForce}
              nodeForce={chargeForce}
              centerForce={centerForce}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const label = node.displayName
                const fontSize = 12/globalScale
                const nodeR = Math.sqrt(node.val || 1) * 15
                
                ctx.beginPath()
                ctx.arc(node.x || 0, node.y || 0, nodeR, 0, 2 * Math.PI)
                ctx.fillStyle = node.color
                ctx.fill()
                ctx.strokeStyle = 'rgba(118, 118, 118, 0.2)'
                ctx.stroke()
                
                if (globalScale > 0.8) {
                  ctx.font = `${fontSize}px Sans-Serif`
                  ctx.textAlign = 'center'
                  ctx.textBaseline = 'middle'
                  ctx.fillStyle = 'black'
                  ctx.fillText(label, node.x || 0, (node.y || 0) + nodeR + fontSize)
                }
              }}
              onEngineStop={() => {
                if (fgRef.current && fgRef.current.graphData) {
                  const { nodes } = fgRef.current.graphData()
                  nodes.forEach((node: any) => {
                    if (!node.fx && !node.fy) {
                      node.fx = node.x
                      node.fy = node.y
                    }
                  })
                  setTimeout(() => fgRef.current?.refresh(), 100)
                }
              }}
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
                      refetch()
                      toast({
                        title: "Refreshing",
                        description: "Attempting to reload graph data...",
                      })
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
        </div>
        {isFinalGraph && (
          <div className="absolute top-4 right-4 z-10">
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Final Merged Graph
            </Badge>
          </div>
        )}
      </div>

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
                <div className="text-sm">{selectedNode.type || selectedNode.label || 'default'}</div>
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