import { useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useOntologyStore } from '@/lib/store/ontology-store'

const nodeWidth = 180
const nodeHeight = 40

export function GraphView() {
  const { entities, sections, selectedEntity, setSelectedEntity, updateEntityPosition } =
    useOntologyStore()

  // Convert entities and relationships to nodes and edges
  const initialNodes: Node[] = entities.map((entity) => ({
    id: entity.id,
    data: { label: entity.name },
    position: entity.position || { 
      x: Math.random() * 500, 
      y: Math.random() * 500 
    },
    style: {
      width: nodeWidth,
      height: nodeHeight,
      backgroundColor: selectedEntity === entity.id ? '#dbeafe' : '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '4px',
      padding: '8px',
    },
  }))

  const initialEdges: Edge[] = entities.flatMap((entity) =>
    Object.entries(entity.relationships || {}).map(([name, rel]) => ({
      id: `${entity.id}-${rel.target}`,
      source: entity.id,
      target: rel.target,
      label: name,
      type: 'smoothstep',
      animated: true,
    }))
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedEntity(node.id)
    },
    [setSelectedEntity]
  )

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      updateEntityPosition(node.id, node.position)
    },
    [updateEntityPosition]
  )

  return (
    <div className="flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-white border rounded-lg"
        />
      </ReactFlow>
    </div>
  )
}
