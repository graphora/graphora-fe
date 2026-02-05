'use client'

import { useEffect, useState } from 'react'
import { GraphDisplay } from './graph-display'
import { useGraphEditorStore } from '@/lib/store/graph-editor-store'
import { Button } from '@/components/ui/button'
import {
  ArrowLeftRight,
  ZoomIn,
  ZoomOut,
  Trash,
  Copy,
  Plus,
  Save,
  Edit,
  Download,
  Upload,
  Maximize,
  Minimize,
  Menu,
  Group
} from 'lucide-react'
import { Point } from '@/lib/utils/point'
import { Vector } from '@/lib/utils/vector'
import { NodeEditor } from './node-editor'
import { RelationshipEditor } from './relationship-editor'
import { Tooltip } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[GraphView]', ...args)
  }
}
const debugWarn = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.warn('[GraphView]', ...args)
  }
}

interface GraphViewProps {
  ontology: any
  onChange: (ontology: any) => void
}

export function GraphView({ ontology, onChange }: GraphViewProps) {
  const {
    fromOntology,
    toOntology,
    setViewTransformation,
    viewTransformation,
    deleteSelection,
    duplicateSelection,
    addNode,
    clearSelection,
    selectNode,
    graph,
    selection,
    canvasSize
  } = useGraphEditorStore()

  // State for editors
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Initialize the graph from the ontology
  useEffect(() => {
    debug('Initializing graph from ontology:', ontology)

    if (!ontology || !ontology.entities) {
      debugWarn('Invalid ontology data:', ontology)
      return;
    }
    
    try {
      // Convert ontology to graph
      fromOntology(ontology);
      debug('Successfully converted ontology to graph')
      
      // Wait a bit for the graph to fully render
      setTimeout(() => {
        handleResetView();
      }, 300);
    } catch (error) {
      console.error('Error converting ontology to graph:', error);
      alert('Error initializing the graph. Please check the console for details.');
    }
  }, [ontology, fromOntology]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle saving the graph to the ontology
  const handleSave = () => {
    try {
      const newOntology = toOntology();
      debug('Converted graph to ontology:', newOntology)
      onChange(newOntology);
    } catch (error) {
      console.error('Error converting graph to ontology:', error);
      alert('There was an error saving the graph. Please check the console for details.');
    }
  };

  // Handle zooming in with stronger zoom
  const handleZoomIn = () => {
    setViewTransformation({
      scale: viewTransformation.scale * 1.5
    });
  };

  // Handle zooming out with stronger zoom
  const handleZoomOut = () => {
    setViewTransformation({
      scale: viewTransformation.scale / 1.5
    });
  };

  // Handle resetting the view to fit all nodes
  const handleResetView = () => {
    const nodes = Object.values(graph.nodes);
    if (nodes.length === 0) {
      // If no nodes, just reset to default
      setViewTransformation({
        scale: 1,
        translate: new Vector(0, 0)
      });
      return;
    }
    
    // Find bounds of all nodes
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x);
      maxY = Math.max(maxY, node.position.y);
    });
    
    // Add padding
    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    // Calculate center point
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Calculate width and height of node area
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Calculate scale to fit all nodes
    const scaleX = canvasSize.width / width;
    const scaleY = canvasSize.height / height;
    const scale = Math.min(scaleX, scaleY, 1.0); // Cap at 1.0 to avoid excessive zoom
    
    // Update view transformation
    setViewTransformation({
      scale: scale,
      translate: new Vector(
        canvasSize.width / 2 - centerX * scale,
        canvasSize.height / 2 - centerY * scale
      )
    });
  };

  // Handle adding a new node at the center of the view
  const handleAddNode = () => {
    // Add a node in the center of the visible area
    const centerX = (canvasSize.width / 2 - viewTransformation.translate.dx) / viewTransformation.scale;
    const centerY = (canvasSize.height / 2 - viewTransformation.translate.dy) / viewTransformation.scale;
    
    const nodeId = addNode(new Point(centerX, centerY), 'New Entity');
    
    // Select and open editor for the new node
    clearSelection();
    selectNode(nodeId);
    setEditingNodeId(nodeId);
  };

  // Handle creating a relationship between selected nodes
  const handleCreateRelationship = () => {
    const { selection, addRelationship } = useGraphEditorStore.getState()

    if (selection.nodes.length === 2) {
      const [fromId, toId] = selection.nodes
      addRelationship(fromId, toId, 'RELATES_TO')
      clearSelection()
    }
  }

  // Handle editing the selected node or relationship
  const handleEdit = () => {
    if (selection.nodes.length === 1) {
      setEditingNodeId(selection.nodes[0])
    } else if (selection.relationships.length === 1) {
      setEditingRelationshipId(selection.relationships[0])
    }
  }

  // Handle exporting the graph as JSON
  const handleExportGraph = () => {
    const graphData = {
      nodes: graph.nodes,
      relationships: graph.relationships,
      style: graph.style
    }

    const dataStr = JSON.stringify(graphData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)

    const exportFileDefaultName = 'graph.json'

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  // Handle importing a graph from JSON
  const handleImportGraph = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'

    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const graphData = JSON.parse(event.target?.result as string)

          // Update the graph with the imported data
          useGraphEditorStore.setState({
            graph: {
              nodes: graphData.nodes || {},
              relationships: graphData.relationships || {},
              style: graphData.style || {}
            }
          })
        } catch (error) {
          console.error('Error importing graph:', error)
        }
      }
      reader.readAsText(file)
    }

    input.click()
  }

  // Toggle full screen mode
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen)
  }

  const graphEditor = (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-10 flex justify-between items-center rounded-t-xl  bg-card p-2 shadow-soft ">
        <div className="flex gap-1 pr-2 flex-nowrap text-foreground/80">
          {/* Hamburger menu only in standard view (not full screen) */}
          <div className={!isFullScreen ? 'block' : 'hidden'}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8 hover:bg-muted">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Node Operations</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={handleAddNode}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Node
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleCreateRelationship}
                    disabled={selection.nodes.length !== 2}
                  >
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Create Relationship
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleEdit}
                    disabled={selection.nodes.length !== 1 && selection.relationships.length !== 1}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Selected
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Selection</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={duplicateSelection}
                    disabled={selection.nodes.length === 0 && selection.relationships.length === 0}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Selection
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={deleteSelection}
                    disabled={selection.nodes.length === 0 && selection.relationships.length === 0}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Selection
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>File Operations</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={handleExportGraph}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Graph
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleImportGraph}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Graph
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Essential view controls - always visible */}
          <Tooltip content="Zoom In">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="flex-shrink-0 ml-2 h-8 w-8 hover:bg-muted"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Zoom Out">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="flex-shrink-0 h-8 w-8 hover:bg-muted"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Reset View">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetView}
              className="flex-shrink-0 h-8 w-8 hover:bg-muted"
            >
              <Group className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-8 flex-shrink-0 bg-white/20 dark:bg-slate-600/50" />

          {/* Visible only in full screen mode */}
          {isFullScreen && (
            <>
              <Tooltip content="Add Node">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAddNode}
                  className="flex-shrink-0 h-8 w-8 hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Create Relationship (select 2 nodes)">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCreateRelationship}
                  disabled={selection.nodes.length !== 2}
                  className="flex-shrink-0 h-8 w-8 bg-white/60 hover:bg-white/70 disabled:opacity-50 dark:bg-slate-800/70 dark:hover:bg-slate-700/70"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Edit Selected">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEdit}
                  disabled={selection.nodes.length !== 1 && selection.relationships.length !== 1}
                  className="flex-shrink-0 h-8 w-8 bg-white/60 hover:bg-white/70 disabled:opacity-50 dark:bg-slate-800/70 dark:hover:bg-slate-700/70"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Duplicate Selection">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={duplicateSelection}
                  disabled={selection.nodes.length === 0 && selection.relationships.length === 0}
                  className="flex-shrink-0 h-8 w-8 bg-white/60 hover:bg-white/70 disabled:opacity-50 dark:bg-slate-800/70 dark:hover:bg-slate-700/70"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Delete Selection">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={deleteSelection}
                  disabled={selection.nodes.length === 0 && selection.relationships.length === 0}
                  className="flex-shrink-0 h-8 w-8 bg-white/60 hover:bg-white/70 disabled:opacity-50 dark:bg-slate-800/70 dark:hover:bg-slate-700/70"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Export Graph">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExportGraph}
                  className="flex-shrink-0 h-8 w-8 hover:bg-muted"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Import Graph">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleImportGraph}
                  className="flex-shrink-0 h-8 w-8 hover:bg-muted"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </Tooltip>
            </>
          )}
        </div>

        <div className="flex gap-1 items-center">
          {/* Full screen button - always visible */}
          <Tooltip content={isFullScreen ? "Exit Full Screen" : "Full Screen"}>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullScreen}
              className="flex-shrink-0 h-8 w-8 hover:bg-muted"
            >
              {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </Tooltip>

          {/* Save to YAML button - always visible */}
          <Tooltip content="Save graph to YAML format">
            <Button
              variant="cta"
              size="sm"
              onClick={handleSave}
              className="flex-shrink-0 ml-2"
            >
              <Save className="h-4 w-4 mr-1" />
              Save to YAML
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 relative overflow-auto">
        <GraphDisplay className="w-full h-full" />
      </div>

      <div className="sticky bottom-0 z-10 rounded-b-xl  bg-card p-2 text-xs text-muted-foreground shadow-soft ">
        <div className="flex justify-between">
          <div>
            <strong>Nodes:</strong> {Object.keys(graph.nodes).length} |
            <strong> Relationships:</strong> {Object.keys(graph.relationships).length}
          </div>
          <div>
            <strong>Zoom:</strong> {Math.round(viewTransformation.scale * 100)}%
          </div>
        </div>
        <div>
          <strong>Tip:</strong> Double-click to add a node. Double-click on a node or relationship to edit it.
        </div>
      </div>

      {/* Node Editor */}
      <NodeEditor
        nodeId={editingNodeId}
        onClose={() => setEditingNodeId(null)}
      />

      {/* Relationship Editor */}
      <RelationshipEditor
        relationshipId={editingRelationshipId}
        onClose={() => setEditingRelationshipId(null)}
      />
    </div>
  )

  return isFullScreen ? (
    <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] flex flex-col p-0 border-border">
        {/* <DialogHeader className="p-4 border-b border-border bg-background">
           <DialogTitle className="text-foreground">Graph Editor (Full Screen)</DialogTitle>
        </DialogHeader> */}
        <div className="flex-1 overflow-auto">
           {graphEditor}
        </div>
      </DialogContent>
    </Dialog>
  ) : (
     <div className="h-full">
        {graphEditor}
     </div>
  )
}
