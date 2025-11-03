'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type Node, type Edge, type GraphData, type GraphOperation } from '@/types/graph';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[GraphViz]', ...args)
  }
}
const debugWarn = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.warn('[GraphViz]', ...args)
  }
}

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return [r, g, b];
};

const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 3) - hash);
  }

  const hue = Math.abs(hash % 360);
  const saturation = 60;
  const lightness = 50;

  const [r, g, b] = hslToRgb(hue, saturation, lightness);

  const toHex = (value: number) => {
    const hex = value.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

const SPECIAL_COLORS = {
  default: '#6b7280'
} as const;

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
}

interface ProcessedRel {
  id: string;
  from: string;
  to: string;
  label: string;
  caption: string;
  properties: Record<string, any>;
}

interface GraphVisualizationProps {
  graphData: GraphData;
  onGraphReset?: () => void;
  onGraphOperation?: (operation: GraphOperation) => void | Promise<void>;
  sidebarWidth?: number;
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

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  graphData,
  onGraphReset,
  onGraphOperation,
  sidebarWidth = 320,
}) => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const nvlRef = useRef<{ fit: () => void }>(null);
  const [hoveredNode, setHoveredNode] = useState<ProcessedNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<ProcessedRel | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [editedProperties, setEditedProperties] = useState<Record<string, any>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [internalNodes, setInternalNodes] = useState<ProcessedNode[]>([]);
  const [internalRels, setInternalRels] = useState<ProcessedRel[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    debug('Raw graphData:', graphData)
  }, [graphData]);

  const processedData = useCallback(() => {
    const uniqueTypes = new Set<string>();
    const nodeMap = new Map<string, Node>();

    const nodes: ProcessedNode[] = graphData.nodes.map((node, index) => {
      if (!node.id || typeof node.id !== 'string') {
        debugWarn(`Node at index ${index} has invalid ID, assigning fallback:`, node);
        node.id = `fallback-node-${index}`;
      }
      const nodeType = node.type || 'default';
      const nodeLabel = node.properties?.name || node.label || node.type || node.id?.toString() || `Node_${index}`;
      
      const processedNode = {
        id: node.id.toString(),
        label: nodeLabel,
        caption: nodeLabel,
        color: stringToColor(nodeType.toLowerCase()),
        size: node.size || 40,
        type: nodeType,
        properties: { ...(node.properties || {}) },
        x: node.x,
        y: node.y
      };
      uniqueTypes.add(nodeType.toLowerCase());
      nodeMap.set(node.id.toString(), processedNode);
      return processedNode;
    });

    const rels: ProcessedRel[] = graphData.edges
      .map((edge, index) => {
        const sourceId = edge.source;
        const targetId = edge.target;

        if (!sourceId) {
          debugWarn(`Edge ${index} has invalid source (sourceId: ${sourceId}), skipping:`, edge);
          return null;
        }
        if (!targetId) {
          debugWarn(`Edge ${index} has invalid target (targetId: ${targetId}), skipping:`, edge);
          return null;
        }
        if (!nodeMap.has(sourceId)) {
          debugWarn(`Edge ${index} sourceId ${sourceId} does not match any node, skipping:`, edge);
          return null;
        }
        if (!nodeMap.has(targetId)) {
          debugWarn(`Edge ${index} targetId ${targetId} does not match any node, skipping:`, edge);
          return null;
        }

        const edgeId = edge.id || `${sourceId}-${targetId}-${edge.label || 'rel'}-${index}`;

        return {
          id: edgeId,
          from: sourceId,
          to: targetId,
          label: edge.label || edge.type || 'Relationship',
          caption: edge.label || edge.type || 'Relationship',
          properties: edge.properties || {}
        };
      })
      .filter((rel): rel is ProcessedRel => rel !== null);

    return {
      nodes: nodes.length > 0 ? nodes : [{ id: 'placeholder', label: 'No Nodes', type: 'default', color: '#ff0000', size: 50 }],
      rels,
      nodeTypes: Array.from(uniqueTypes)
    };
  }, [graphData]);

  useEffect(() => {
    if (graphData) {
      const { nodes, rels } = processedData();
      setInternalNodes(nodes as ProcessedNode[]);
      setInternalRels(rels as ProcessedRel[]);
    }
  }, [graphData, processedData]);

  const currentGraphData = processedData();

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

  const handleReset = () => {
    if (nvlRef.current?.fit) {
      nvlRef.current.fit();
      onGraphReset?.();
    }
  };

  const mouseEventCallbacks = {
    onZoom: (zoomLevel: number) => {},
    onDrag: (nodes: ProcessedNode[]) => {},
    onPan: (position: { x: number; y: number }) => {},
    onNodeHover: (node: ProcessedNode | null | undefined) => {
      debug('onNodeHover called with:', node) // Debug log
      setHoveredNode(node ?? null); // Ensure undefined is converted to null
    },
    onRelationshipHover: (rel: ProcessedRel | null | undefined) => {
      debug('onRelationshipHover called with:', rel) // Debug log
      setHoveredLink(rel ?? null); // Ensure undefined is converted to null
    },
    onNodeClick: (node: ProcessedNode) => {
      const originalNode = graphData.nodes.find(n => n.id === node.id);
      if (originalNode) {
        setSelectedElement({ type: 'node', data: originalNode });
        setEditedProperties({ name: originalNode.properties?.name, ...originalNode.properties });
      } else {
        debugWarn('Clicked node not found in original graphData:', node);
      }
      setHoveredNode(null);
      setHoveredLink(null);
    },
    onRelationshipClick: (rel: ProcessedRel) => {
      const originalEdge = graphData.edges.find(edge => {
        return edge.source === rel.from && edge.target === rel.to && (edge.label || edge.type) === rel.label;
      });

      if (originalEdge) {
        setSelectedElement({ type: 'link', data: originalEdge });
        setEditedProperties({ ...originalEdge.properties });
      } else {
        debugWarn('Clicked relationship not found in original graphData edges based on ProcessedRel:', rel);
      }
      setHoveredNode(null);
      setHoveredLink(null);
    },
    onCanvasClick: () => {
      setHoveredNode(null);
      setHoveredLink(null);
      setSelectedElement(null);
    },
  };

  const handlePropertyChange = (key: string, value: string) => {
    setEditedProperties(prev => ({
      ...prev,
      [key]: value === '' ? null : value
    }));
  };

  const handleAddProperty = () => {
    const key = prompt('Enter property name:');
    if (key) {
      setEditedProperties(prev => ({
        ...prev,
        [key]: ''
      }));
    }
  };

  const handleDeleteProperty = (key: string) => {
    const newProps = { ...editedProperties };
    delete newProps[key];
    setEditedProperties(newProps);
  };

  const handleSaveChanges = async () => {
    if (selectedElement && !isSaving) {
      setIsSaving(true);
      let operation: GraphOperation | null = null;

      if (selectedElement.type === 'node') {
        const node = selectedElement.data as Node;
        operation = {
          type: 'UPDATE_NODE',
          payload: {
            id: node.id,
            properties: editedProperties
          }
        };
      } else {
        const edge = selectedElement.data as Edge;
        const edgeId = edge.id || `${edge.source}-${edge.target}-${edge.label || 'rel'}`;
        if (!edgeId) {
            console.error("Cannot save edge changes: Edge ID is missing or cannot be constructed.", edge);
            toast.error("Cannot save edge changes: Edge ID missing.");
            setIsSaving(false);
            return;
        }
        operation = {
          type: 'UPDATE_EDGE',
          payload: {
            id: edgeId,
            properties: editedProperties
          }
        };
      }

      try {
        if (onGraphOperation && operation) {
          await onGraphOperation(operation);
        } else {
          debugWarn('onGraphOperation prop not provided to GraphVisualization.');
        }

        if (selectedElement.type === 'node') {
          const nodeIndex = internalNodes.findIndex(n => n.id === (selectedElement.data as Node).id);
          if (nodeIndex !== -1) {
            const updatedNode = {
              ...internalNodes[nodeIndex],
              properties: editedProperties,
              label: editedProperties.name || internalNodes[nodeIndex].label,
              caption: editedProperties.name || internalNodes[nodeIndex].caption,
            };
            setInternalNodes(prevNodes => [
              ...prevNodes.slice(0, nodeIndex),
              updatedNode,
              ...prevNodes.slice(nodeIndex + 1),
            ]);
          }
        } else {
          const originalEdge = selectedElement.data as Edge;
          const edgeIndex = internalRels.findIndex(r =>
            r.from === originalEdge.source &&
            r.to === originalEdge.target &&
            r.label === (originalEdge.label || originalEdge.type || 'Relationship')
          );
          if (edgeIndex !== -1) {
            const updatedRel = {
              ...internalRels[edgeIndex],
              properties: editedProperties,
            };
            setInternalRels(prevRels => [
              ...prevRels.slice(0, edgeIndex),
              updatedRel,
              ...prevRels.slice(edgeIndex + 1),
            ]);
          }
        }

        setSelectedElement(null);
      } catch (error) {
        console.error('Error saving changes:', error);
        alert('Failed to save changes. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (currentGraphData.nodes.length === 1 && currentGraphData.nodes[0].id === 'placeholder') {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-gray-500">No valid nodes to display.</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-background rounded-lg overflow-hidden border border-border"
      onMouseMove={handleMouseMove}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => isDragging && setIsDragging(false)}
    >
      {dimensions.width > 0 && dimensions.height > 0 ? (
        <ErrorBoundary>
          <InteractiveNvlWrapper
            ref={nvlRef}
            nodes={internalNodes}
            rels={internalRels}
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
              nodeSize: 50,
              relationshipLabelKey: 'label',
              relationshipLabelsVisible: true,
              relationshipArrowSize: 3,
              labelFontSize: 20,
              labelColor: isDark ? '#e2e8f0' : '#1e293b',
              labelBackgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
              nodeBorderWidth: 2,
              useWebGL: true,
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
            }}
            style={{ width: '100%', height: '100%' }}
          />
        </ErrorBoundary>
      ) : (
        <div className="flex items-center justify-center h-full w-full">
          <div className="text-gray-500">Loading graph dimensions...</div>
        </div>
      )}

      {/* Tooltip for hover */}
      {(hoveredNode || hoveredLink) && !selectedElement && (
        <div
          className="absolute bg-popover p-3 rounded-lg shadow-lg border border-border z-50 max-w-xs text-sm pointer-events-none"
          style={{
            left: `${tooltipPosition.x + 20}px`,
            top: `${tooltipPosition.y + 15}px`,
            maxWidth: 'calc(100% - 40px)',
            maxHeight: 'calc(100% - 30px)'
          }}
        >
          {hoveredNode && hoveredNode.label && hoveredNode.type && (
            <>
              <div className="font-semibold text-base text-popover-foreground">{hoveredNode.label || 'Unnamed'}</div>
              <div className="text-muted-foreground mb-1">Type: {hoveredNode.type || 'Unknown'}</div>
            </>
          )}
          {hoveredLink && hoveredLink.caption && hoveredLink.from && hoveredLink.to && (
            <>
              <div className="font-semibold text-base text-popover-foreground">{hoveredLink.caption || 'Relationship'}</div>
              <div className="text-muted-foreground mb-1">
                {hoveredLink.from} → {hoveredLink.to}
              </div>
            </>
          )}
        </div>
      )}

      {/* Property Editing Modal */}
      {selectedElement && (
        <Dialog open={!!selectedElement} onOpenChange={() => setSelectedElement(null)} modal={true}>
          <DialogContent className="sm:max-w-[800px] max-h-[85vh] w-[95vw] lg:w-[800px] overflow-y-auto bg-popover border-border shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-popover-foreground">{selectedElement.type === 'node' ? 'Node Details' : 'Edge Details'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedElement.type === 'node' && (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    <span className="font-medium text-popover-foreground">Type:</span>
                    <span className="col-span-3 text-popover-foreground">{(selectedElement.data as Node).type || 'Unknown'}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <span className="font-medium text-popover-foreground">Name:</span>
                    <input
                      value={editedProperties.name || ''}
                      onChange={e => handlePropertyChange('name', e.target.value)}
                      className="col-span-3 border border-border rounded px-3 py-2 w-full bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </>
              )}
              {selectedElement.type === 'link' && (
                <div className="grid grid-cols-4 gap-2">
                  <span className="font-medium text-popover-foreground">Type:</span>
                  <span className="col-span-3 text-popover-foreground">{(selectedElement.data as Edge).label || (selectedElement.data as Edge).type || 'Link'}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-popover-foreground block mb-2">Properties:</span>
                <div className="space-y-2 max-h-96 overflow-y-auto border border-border rounded p-3 bg-muted/30">
                  {Object.entries(editedProperties).length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No properties available</p>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-popover-foreground font-medium">Property</th>
                          <th className="text-left py-2 text-popover-foreground font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(editedProperties).map(([key, value]) => (
                          <tr key={key} className="border-b border-border/50">
                            <td className="py-2 pr-4 text-popover-foreground font-medium">{key}</td>
                            <td className="py-2">
                              <input
                                value={String(value || '')}
                                onChange={e => handlePropertyChange(key, e.target.value)}
                                className="w-full border border-border rounded px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setSelectedElement(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="absolute bottom-4 right-4 flex gap-2 z-5">
        <button
          onClick={() => nvlRef.current?.fit()}
          className="bg-background p-2 rounded-full shadow-md hover:bg-muted text-foreground transition-colors border border-border"
          title="Center and fit graph"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
          </svg>
        </button>
        {onGraphReset && (
          <button
            onClick={handleReset}
            className="bg-background p-2 rounded-full shadow-md hover:bg-muted text-foreground transition-colors border border-border"
            title="Reset graph"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5"></path>
            </svg>
          </button>
        )}
      </div>

      <div
        className="absolute top-4 right-4 flex flex-col gap-2 z-5"
      >
        <div className="bg-background/90 p-2 rounded-md shadow-sm text-xs backdrop-blur-sm border border-border">
          <div className="font-medium text-foreground mb-1">Graph Information</div>
          <div className="text-muted-foreground">Nodes: {currentGraphData.nodes.length}</div>
          <div className="text-muted-foreground">Edges: {currentGraphData.rels.length}</div>
        </div>
        {currentGraphData.nodeTypes.length > 0 && (
          <div className="bg-background/90 p-2 rounded-md shadow-sm text-xs backdrop-blur-sm max-h-40 overflow-y-auto border border-border">
            <div className="font-medium text-foreground mb-1">Node Types</div>
            <div className="grid grid-cols-1 gap-1">
              {currentGraphData.nodeTypes.map((type) => (
                <div key={type} className="flex items-center">
                  <span
                    className="w-3 h-3 rounded-full mr-1.5 border border-border"
                    style={{ backgroundColor: stringToColor(type.toLowerCase()) }}
                  ></span>
                  <span className="capitalize text-muted-foreground">{type.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
