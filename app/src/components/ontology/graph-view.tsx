'use client'

import { useEffect, useState } from 'react'
import { GraphDisplay } from './graph-display'
import { useGraphEditorStore } from '@/lib/store/graph-editor-store'
import { useOntologyEditorStore } from '@/lib/store/ontology-editor-store'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeftRight, 
  ZoomIn, 
  ZoomOut, 
  Trash, 
  Copy, 
  Plus,
  Save,
  RotateCcw,
  Edit,
  Grid,
  Download,
  Upload,
  Maximize,
  Minimize
} from 'lucide-react'
import { Point } from '@/lib/utils/point'
import { Vector } from '@/lib/utils/vector'
import { NodeEditor } from './node-editor'
import { RelationshipEditor } from './relationship-editor'
import { Tooltip } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent } from '@/components/ui/dialog'

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
    graph,
    selection
  } = useGraphEditorStore()

  // State for editors
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Initialize the graph from the ontology
  useEffect(() => {
    console.log('Initializing graph from ontology:', ontology)
    
    if (ontology && ontology.entities) {
      // Count the relationships in the ontology for debugging
      let relationshipCount = 0
      Object.values(ontology.entities).forEach((entity: any) => {
        if (entity.relationships) {
          relationshipCount += Object.keys(entity.relationships).length
        }
      })
      console.log(`Ontology has ${Object.keys(ontology.entities).length} entities and approximately ${relationshipCount} relationships`)
    }
    
    fromOntology(ontology)
  }, [ontology, fromOntology])

  // Handle saving the graph to the ontology
  const handleSave = () => {
    const newOntology = toOntology()
    onChange(newOntology)
  }

  // Handle zooming in
  const handleZoomIn = () => {
    setViewTransformation({
      scale: viewTransformation.scale * 1.2
    })
  }

  // Handle zooming out
  const handleZoomOut = () => {
    setViewTransformation({
      scale: viewTransformation.scale / 1.2
    })
  }

  // Handle resetting the view
  const handleResetView = () => {
    setViewTransformation({
      scale: 1,
      translate: new Vector(0, 0)
    })
  }

  // Handle adding a new node
  const handleAddNode = () => {
    // Add a node in the center of the view
    const centerX = 400 / viewTransformation.scale - viewTransformation.translate.dx / viewTransformation.scale
    const centerY = 300 / viewTransformation.scale - viewTransformation.translate.dy / viewTransformation.scale
    addNode(new Point(centerX, centerY), 'New Entity')
  }

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
      <div className="border-b p-2 flex justify-between items-center">
        <div className="flex gap-1">
          <Tooltip content="Add Node">
            <Button
              variant="outline"
              size="icon"
              onClick={handleAddNode}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </Tooltip>
          
          <Tooltip content="Create Relationship (select 2 nodes)">
            <Button
              variant="outline"
              size="icon"
              onClick={handleCreateRelationship}
              disabled={selection.nodes.length !== 2}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          </Tooltip>
          
          <Tooltip content="Edit Selected">
            <Button
              variant="outline"
              size="icon"
              onClick={handleEdit}
              disabled={selection.nodes.length !== 1 && selection.relationships.length !== 1}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </Tooltip>
          
          <Separator orientation="vertical" className="mx-1 h-8" />
          
          <Tooltip content="Duplicate Selection">
            <Button
              variant="outline"
              size="icon"
              onClick={duplicateSelection}
              disabled={selection.nodes.length === 0 && selection.relationships.length === 0}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </Tooltip>
          
          <Tooltip content="Delete Selection">
            <Button
              variant="outline"
              size="icon"
              onClick={deleteSelection}
              disabled={selection.nodes.length === 0 && selection.relationships.length === 0}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
        
        <div className="flex gap-1">
          <Tooltip content="Zoom In">
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </Tooltip>
          
          <Tooltip content="Zoom Out">
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </Tooltip>
          
          <Tooltip content="Reset View">
            <Button
              variant="outline"
              size="icon"
              onClick={handleResetView}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </Tooltip>
          
          <Separator orientation="vertical" className="mx-1 h-8" />
          
          <Tooltip content="Export Graph">
            <Button
              variant="outline"
              size="icon"
              onClick={handleExportGraph}
            >
              <Download className="h-4 w-4" />
            </Button>
          </Tooltip>
          
          <Tooltip content="Import Graph">
            <Button
              variant="outline"
              size="icon"
              onClick={handleImportGraph}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </Tooltip>
          
          <Separator orientation="vertical" className="mx-1 h-8" />
          
          <Tooltip content={isFullScreen ? "Exit Full Screen" : "Full Screen"}>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleFullScreen}
            >
              {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </Tooltip>
          
          <Separator orientation="vertical" className="mx-1 h-8" />
          
          <Tooltip content="Save graph to YAML format">
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
            >
              <Save className="h-4 w-4 mr-1" />
              Save to YAML
            </Button>
          </Tooltip>
        </div>
      </div>
      
      <div className="flex-1 relative">
        <GraphDisplay className="absolute inset-0" />
      </div>
      
      <div className="border-t p-2 text-xs text-muted-foreground">
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
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh]">
        {graphEditor}
      </DialogContent>
    </Dialog>
  ) : graphEditor
}
