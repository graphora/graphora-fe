import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  Position,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useOntologyStore } from '@/lib/store/ontology-store'

const nodeTypes = {
  section: ({ data }) => (
    <div className="px-4 py-2 shadow-lg rounded-lg bg-background border-2 border-primary">
      <div className="font-semibold">{data.label}</div>
    </div>
  ),
  entity: ({ data }) => (
    <div className="px-4 py-2 shadow-lg rounded-lg bg-card border">
      <div className="font-medium">{data.label}</div>
      {data.type && (
        <div className="text-xs text-muted-foreground">{data.type}</div>
      )}
    </div>
  ),
}

export function GraphView() {
  const { entities, relationships } = useOntologyStore()

  const initialNodes: Node[] = useMemo(() => {
    return entities.map((entity, index) => {
      // Calculate grid-like positions
      const column = index % 3
      const row = Math.floor(index / 3)
      return {
        id: entity.id,
        type: entity.isSection ? 'section' : 'entity',
        position: entity.position || { 
          x: 50 + column * 300, 
          y: 50 + row * 200 
        },
        data: {
          label: entity.name,
          type: entity.type,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }
    })
  }, [entities])

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = []
    
    // Add parent-child relationships
    entities.forEach(entity => {
      if (entity.parentIds) {
        entity.parentIds.forEach(parentId => {
          edges.push({
            id: `${parentId}-${entity.id}`,
            source: parentId,
            target: entity.id,
            type: 'smoothstep',
            animated: false,
            style: { stroke: 'hsl(var(--primary))' },
          })
        })
      }
    })

    // Add custom relationships
    relationships.forEach(rel => {
      edges.push({
        id: `${rel.sourceId}-${rel.targetId}-${rel.type}`,
        source: rel.sourceId,
        target: rel.targetId,
        type: 'smoothstep',
        animated: true,
        label: rel.type,
        labelStyle: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
        style: { stroke: 'hsl(var(--primary))' },
      })
    })

    return edges
  }, [entities, relationships])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onNodeDragStop = useCallback(
    (event: any, node: Node) => {
      const entity = entities.find(e => e.id === node.id)
      if (entity) {
        entity.position = node.position
      }
    },
    [entities]
  )

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        className="bg-muted/20"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
