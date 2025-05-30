'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { type Node, type Edge, type GraphData, type GraphOperation } from '@/types/graph';
import { toast } from 'react-hot-toast';
import { useTheme } from 'next-themes';

const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const SPECIAL_COLORS: Record<string, string> = {
  conflict: '#f59e0b',
  conflict_source: '#f97316',
  conflict_target: '#ec4899',
  default: '#6b7280'
};

const InteractiveNvlWrapper: any = dynamic(
  () => import('@neo4j-nvl/react').then(mod => mod.InteractiveNvlWrapper),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-gray-500">Loading graph visualization...</div>
      </div>
    )
  }
);

interface ProcessedNode {
  id: string;
  label: string;
  caption: string;
  color: string;
  size: number;
  type: string;
  properties: Record<string, any>;
  x?: number;
  y?: number;
  displayName: string;
}

interface ProcessedRel {
  id: string;
  from: string;
  to: string;
  label: string;
  caption: string;
  properties: Record<string, any>;
}

interface MergeGraphVisualizationProps {
  transformId?: string;
  mergeId?: string;
  loading?: boolean;
  error?: string | null;
  currentConflict?: any;
  graphData?: GraphData;
  onGraphReset?: () => void;
  onGraphOperation?: (operation: GraphOperation) => void | Promise<void>;
}

interface SelectedElement {
  type: 'node' | 'link';
  data: Node | Edge;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full w-full">
          <div className="text-red-500">
            Error rendering graph: {this.state.error?.message || 'Unknown error'}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const MergeGraphVisualization: React.FC<MergeGraphVisualizationProps> = ({
  transformId,
  mergeId,
  loading: externalLoading,
  error: externalError,
  currentConflict,
  graphData: externalGraphData,
  onGraphReset,
  onGraphOperation,
}) => {
  const { resolvedTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null);
  const nvlRef = useRef<any>(null); // Use any for now to avoid ref typing issues
  const [hoveredNode, setHoveredNode] = useState<ProcessedNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<ProcessedRel | null>(null);
  const [selectedNode, setSelectedNode] = useState<ProcessedNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<ProcessedRel | null>(null); // New state for selected relationship
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const [showLinkPropertiesModal, setShowLinkPropertiesModal] = useState(false); // New state for relationship modal
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [typeColors, setTypeColors] = useState<Record<string, string>>({});
  const [isFinalGraph, setIsFinalGraph] = useState(false);
  const [finalGraphData, setFinalGraphData] = useState<GraphData | null>(null);
  const isDark = resolvedTheme === 'dark'

  const graphData = finalGraphData || externalGraphData;

  const processedGraphData = useCallback(() => {
    if (!graphData?.nodes?.length) return { nodes: [], rels: [], nodeTypes: [] };

    const nodesMap = new Map<string, ProcessedNode>();
    const uniqueTypes = new Set<string>();

    const nodes: ProcessedNode[] = graphData.nodes
      .filter((node: Node) => {
        if (!node) return false;
        const nodeType = node.type || node.label || 'default';
        if (nodeType.startsWith('__')) return false;
        if (!filters[`show${nodeType}`]) return false;
        if (searchQuery) {
          const nodeStr = JSON.stringify(node).toLowerCase();
          return nodeStr.includes(searchQuery.toLowerCase());
        }
        return true;
      })
      .map((node: Node, idx: number) => {
        const nodeId = node.id?.toString() || `node-${idx}`;
        const nodeType = node.type || node.label || 'default';
        uniqueTypes.add(nodeType);
        let color = typeColors[nodeType] || SPECIAL_COLORS.default;

        if (!isFinalGraph && currentConflict) {
          if (currentConflict.nodeId === nodeId || 
              currentConflict.relatedNodes?.includes(nodeId)) {
            color = currentConflict.source === nodeId ? 
              SPECIAL_COLORS.conflict_source : 
              SPECIAL_COLORS.conflict_target;
          }
        }

        const processedNode: ProcessedNode = {
          id: nodeId,
          label: node.properties?.name || node.label || node.type || 'Unnamed',
          caption: node.properties?.name || node.label || node.type || 'Unnamed',
          displayName: node.properties?.name || node.label || node.type || 'Unnamed',
          color,
          size: 40,
          type: nodeType,
          properties: { ...(node.properties || {}) },
          x: node.x,
          y: node.y
        };
        nodesMap.set(nodeId, processedNode);
        return processedNode;
      });

    const rels: ProcessedRel[] = graphData.edges
      .filter((edge: Edge) => {
        const sourceExists = nodesMap.has(edge.source);
        const targetExists = nodesMap.has(edge.target);
        return sourceExists && targetExists;
      })
      .map((edge: Edge, idx: number) => {
        const edgeId = edge.id || `${edge.source}-${edge.target}-${edge.label || 'rel'}-${idx}`;
        let color = SPECIAL_COLORS.default;
        if (!isFinalGraph && currentConflict && currentConflict.edgeId === edgeId) {
          color = SPECIAL_COLORS.conflict;
        }

        return {
          id: edgeId,
          from: edge.source,
          to: edge.target,
          label: edge.type || edge.label || 'Relationship',
          caption: edge.type || edge.label || 'Relationship',
          properties: edge.properties || {}
        };
      });

    return {
      nodes: nodes.length > 0 ? nodes : [{ 
        id: 'placeholder', 
        label: 'No Nodes', 
        caption: 'No Nodes',
        displayName: 'No Nodes',
        type: 'default', 
        color: '#ff0000', 
        size: 40
      }],
      rels,
      nodeTypes: Array.from(uniqueTypes)
    };
  }, [graphData, filters, searchQuery, currentConflict, isFinalGraph, typeColors]);

  useEffect(() => {
    if (graphData?.nodes) {
      const types = Array.from(
        new Set(graphData.nodes
          .filter((node: Node) => {
            const nodeType = node.type || node.label || 'default';
            return !nodeType.startsWith('__');
          })
          .map((node: Node) => node.type || node.label || 'default'))
      );
      setAvailableTypes(types);

      const newTypeColors = types.reduce((acc, type) => ({
        ...acc,
        [type]: stringToColor(type)
      }), SPECIAL_COLORS as any);
      setTypeColors(newTypeColors);

      const newFilters = types.reduce((acc, type) => ({
        ...acc,
        [`show${type}`]: true
      }), {});
      setFilters(newFilters);
    }
  }, [graphData]);

  const currentGraphData = processedGraphData();

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height: Math.max(height, 400) });
      }
    });
    observer.observe(containerRef.current);
    const { width, height } = containerRef.current.getBoundingClientRect();
    setDimensions({ width, height: Math.max(height, 400) });
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    }
  }, [isDragging]);

  const handleZoomIn = () => {
    if (!nvlRef.current) {
      console.warn('Graph visualization ref not initialized for zoom in');
      return;
    }
    
    try {
      // Try different zoom approaches that might be available in the component
      if (typeof nvlRef.current.zoomIn === 'function') {
        // If there's a direct zoomIn method
        nvlRef.current.zoomIn();
      } else if (typeof nvlRef.current.zoom === 'function') {
        // If there's a zoom method that takes a factor
        if (typeof nvlRef.current.getZoom === 'function') {
          const currentZoom = nvlRef.current.getZoom();
          nvlRef.current.zoom(currentZoom * 1.2); // Increase by 20%
        } else {
          // If we can't get current zoom, just pass a factor directly
          nvlRef.current.zoom(1.2);
        }
      } else if (typeof nvlRef.current.setZoom === 'function') {
        // If there's a setZoom method
        if (typeof nvlRef.current.getZoom === 'function') {
          const currentZoom = nvlRef.current.getZoom();
          nvlRef.current.setZoom(currentZoom * 1.2);
        } else {
          // Try a reasonable default zoom level
          nvlRef.current.setZoom(1.2);
        }
      } else {
        console.warn('No suitable zoom method found on graph ref');
      }
    } catch (err) {
      console.error('Error zooming in:', err);
    }
  };

  const handleZoomOut = () => {
    if (!nvlRef.current) {
      console.warn('Graph visualization ref not initialized for zoom out');
      return;
    }
    
    try {
      // Try different zoom approaches that might be available in the component
      if (typeof nvlRef.current.zoomOut === 'function') {
        // If there's a direct zoomOut method
        nvlRef.current.zoomOut();
      } else if (typeof nvlRef.current.zoom === 'function') {
        // If there's a zoom method that takes a factor
        if (typeof nvlRef.current.getZoom === 'function') {
          const currentZoom = nvlRef.current.getZoom();
          nvlRef.current.zoom(currentZoom * 0.8); // Decrease by 20%
        } else {
          // If we can't get current zoom, just pass a factor directly
          nvlRef.current.zoom(0.8);
        }
      } else if (typeof nvlRef.current.setZoom === 'function') {
        // If there's a setZoom method
        if (typeof nvlRef.current.getZoom === 'function') {
          const currentZoom = nvlRef.current.getZoom();
          nvlRef.current.setZoom(currentZoom * 0.8);
        } else {
          // Try a reasonable default zoom level
          nvlRef.current.setZoom(0.8);
        }
      } else {
        console.warn('No suitable zoom method found on graph ref');
      }
    } catch (err) {
      console.error('Error zooming out:', err);
    }
  };

  const handleReset = () => {
    if (!nvlRef.current) {
      console.warn('Graph visualization ref not initialized for reset');
      return;
    }
    
    try {
      if (typeof nvlRef.current.fit === 'function') {
        nvlRef.current.fit();
        console.log('Graph reset executed');
        onGraphReset?.();
      } else if (typeof nvlRef.current.resetView === 'function') {
        nvlRef.current.resetView();
        onGraphReset?.();
      } else if (typeof nvlRef.current.reset === 'function') {
        nvlRef.current.reset();
        onGraphReset?.();
      } else {
        console.warn('No suitable reset method found on graph ref');
      }
    } catch (err) {
      console.error('Error resetting view:', err);
    }
  };

  const mouseEventCallbacks = {
    onZoom: (zoomLevel: number) => {},
    onDrag: (nodes: ProcessedNode[]) => {},
    onPan: (position: { x: number; y: number }) => {},
    onNodeHover: (node: ProcessedNode | null | undefined) => {
      setHoveredNode(node ?? null);
    },
    onRelationshipHover: (rel: ProcessedRel | null | undefined) => {
      setHoveredLink(rel ?? null);
    },
    onNodeClick: (node: ProcessedNode) => {
      setSelectedNode(node);
      setShowPropertiesModal(true);
      setHoveredNode(null);
      setHoveredLink(null);
    },
    onRelationshipClick: (rel: ProcessedRel) => {
      // Handle relationship clicks - show relationship properties modal
      setSelectedLink(rel);
      setShowLinkPropertiesModal(true);
      setHoveredNode(null);
      setHoveredLink(null);
    },
    onCanvasClick: () => {
      setHoveredNode(null);
      setHoveredLink(null);
      setSelectedNode(null);
      setSelectedLink(null);
      setShowPropertiesModal(false);
      setShowLinkPropertiesModal(false);
    },
  };

  if (externalLoading) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center">
        <div className="text-gray-400">Loading graph data...</div>
      </div>
    );
  }

  if (externalError) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center">
        <div className="text-red-500">{externalError}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-background">
      {/* Graph Information - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-background/90 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-border text-sm">
          <div className="font-medium mb-1 text-foreground">Graph Information</div>
          <div className="text-muted-foreground">Nodes: {currentGraphData.nodes.length}</div>
          <div className="text-muted-foreground">Edges: {currentGraphData.rels.length}</div>
        </div>
      </div>

      {/* Search Controls - Top Left */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-background/90 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-border w-64">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Search</label>
              <Input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 text-sm"
              />
            </div>
            
            {availableTypes.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Node Types</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {availableTypes.map((type) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="flex items-center">
                        <div 
                          className="w-2 h-2 rounded-full mr-2" 
                          style={{ backgroundColor: typeColors[type] }} 
                        />
                        <span className="text-foreground truncate">{type}</span>
                      </span>
                      <Switch
                        checked={filters[`show${type}`]}
                        onCheckedChange={(checked) => 
                          setFilters(prev => ({ ...prev, [`show${type}`]: checked }))
                        }
                        className="ml-2 scale-75 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600 data-[state=checked]:bg-primary border border-gray-400 dark:border-gray-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Controls - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-background/90 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-border">
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={handleZoomIn}
              title="Zoom In"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={handleReset}
              title="Reset View"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Graph Container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => isDragging && setIsDragging(false)}
      >
        {dimensions.width > 0 && dimensions.height > 0 ? (
          <ErrorBoundary>
            <InteractiveNvlWrapper
              ref={nvlRef}
              nodes={currentGraphData.nodes}
              rels={currentGraphData.rels}
              width={dimensions.width}
              height={dimensions.height}
              interactionOptions={{
                zoom: { enabled: true, minZoom: 0.1, maxZoom: 10 },
                drag: { enabled: true },
                pan: { enabled: true },
                hover: { enabled: !isDragging },
                click: { selectOnClick: true }
              }}
              mouseEventCallbacks={mouseEventCallbacks}
              nvlOptions={{
                initialZoom: 0.8,
                layout: 'forceDirected',
                layoutSettings: {
                  nodeDistance: 100,
                  nodeRepulsion: 5000,
                },
                availableLayouts: ['forceDirected'],
                renderer: 'canvas',
                nodeLabelsVisible: true,
                nodeLabelKey: 'label',
                nodeSize: 40,
                relationshipLabelKey: 'label',
                relationshipLabelsVisible: true,
                relationshipArrowSize: 3,
                labelFontSize: 12,
                labelColor: isDark ? '#e2e8f0' : '#1e293b',
                labelBackgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                nodeBorderWidth: 2,
                useWebGL: true,
                backgroundColor: isDark ? '#0f172a' : '#f8fafc'
              }}
              style={{ width: '100%', height: '100%' }}
            />
          </ErrorBoundary>
        ) : (
          <div className="flex items-center justify-center h-full w-full">
            <div className="text-gray-500">Loading graph dimensions...</div>
          </div>
        )}

        {/* Tooltip */}
        {(hoveredNode || hoveredLink) && !showPropertiesModal && (
          <div
            className="absolute bg-background p-3 rounded-lg shadow-lg border border-border z-50 max-w-xs text-sm pointer-events-none"
            style={{
              left: `${tooltipPosition.x + 20}px`,
              top: `${tooltipPosition.y + 15}px`,
            }}
          >
            {hoveredNode && (
              <>
                <div className="font-semibold text-foreground">{hoveredNode.displayName}</div>
                <div className="text-muted-foreground">Type: {hoveredNode.type}</div>
              </>
            )}
            {hoveredLink && (
              <>
                <div className="font-semibold text-foreground">{hoveredLink.caption}</div>
                <div className="text-muted-foreground">
                  {hoveredLink.from} → {hoveredLink.to}
                </div>
              </>
            )}
          </div>
        )}

        {/* Node Properties Modal */}
        <Dialog open={showPropertiesModal} onOpenChange={setShowPropertiesModal}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto bg-background">
            <DialogHeader>
              <DialogTitle>Node Details</DialogTitle>
            </DialogHeader>
            {selectedNode && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  <span className="font-medium text-foreground">Name:</span>
                  <span className="col-span-3 text-foreground">{selectedNode.displayName}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <span className="font-medium text-foreground">Type:</span>
                  <span className="col-span-3 text-foreground">{selectedNode.type}</span>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-foreground">Properties:</h4>
                  </div>
                  <div className="border rounded-md overflow-hidden border-border">
                    <table className="w-full border-collapse">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground border-b border-border w-1/3">Property</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground border-b border-border w-2/3">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedNode.properties && Object.entries(selectedNode.properties).map(([key, value]) => (
                          <tr key={key} className="border-b">
                            <td className="p-3 align-top">
                              <span className="inline-flex items-center">
                                {key}
                                {key.startsWith('_') && <span className="ml-1 text-xs text-gray-500">(system)</span>}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
                                {typeof value === 'object' 
                                  ? (value === null 
                                      ? 'null' 
                                      : JSON.stringify(value, null, 2))
                                  : String(value)
                                }
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="mt-4">
              <Button onClick={() => setShowPropertiesModal(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Relationship Properties Modal */}
        <Dialog open={showLinkPropertiesModal} onOpenChange={setShowLinkPropertiesModal}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto bg-background">
            <DialogHeader>
              <DialogTitle>Relationship Details</DialogTitle>
            </DialogHeader>
            {selectedLink && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  <span className="font-medium text-gray-700">Type:</span>
                  <span className="col-span-3">{selectedLink.label}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <span className="font-medium text-gray-700">Direction:</span>
                  <span className="col-span-3">
                    <span className="text-blue-600">{selectedLink.from}</span>
                    <span className="mx-2">→</span>
                    <span className="text-green-600">{selectedLink.to}</span>
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-800">Properties:</h4>
                  </div>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full border-collapse">
                      <thead className="bg-background">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground border-b w-1/3">Property</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground border-b w-2/3">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {Object.keys(selectedLink.properties).length > 0 ? (
                          Object.entries(selectedLink.properties).map(([key, value]) => (
                            <tr key={key} className="border-b">
                              <td className="p-3 align-top">
                                <span className="inline-flex items-center">
                                  {key}
                                  {key.startsWith('_') && <span className="ml-1 text-xs text-gray-500">(system)</span>}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
                                  {typeof value === 'object' 
                                    ? (value === null 
                                        ? 'null' 
                                        : JSON.stringify(value, null, 2))
                                    : String(value)
                                  }
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2} className="p-3 text-center text-gray-500">
                              No properties
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="mt-4">
              <Button onClick={() => setShowLinkPropertiesModal(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isFinalGraph && (
          <div className="absolute top-4 right-4 z-10">
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Final Merged Graph
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};