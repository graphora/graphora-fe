import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  Position,
  useNodesState,
  useEdgesState,
  Handle,
  MarkerType
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useOntologyStore } from '@/lib/store/ontology-store'

const nodeTypes = {
  section: ({ data }: any) => (
    <div className="px-4 py-2 shadow-lg rounded-lg bg-background border-2 border-primary">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-primary" 
      />
      <div className="font-semibold">{data.label}</div>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-primary" 
      />
    </div>
  ),
  entity: ({ data }: any) => (
    <div className="px-4 py-2 shadow-lg rounded-lg bg-card border">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-primary" 
      />
      <div className="font-medium">{data.label}</div>
      {data.type && (
        <div className="text-xs text-muted-foreground">{data.type}</div>
      )}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-primary" 
      />
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
      if (!rel.sourceId || !rel.targetId) return // Skip invalid relationships
      
      edges.push({
        id: `${rel.sourceId}-${rel.targetId}-${rel.type}`,
        source: rel.sourceId,
        target: rel.targetId,
        type: 'smoothstep',
        label: rel.type,
        labelStyle: { fill: 'hsl(var(--foreground))', fontWeight: 500 },
        style: { 
          stroke: 'hsl(var(--primary))',
          strokeWidth: 2
        },
        markerEnd: {
          type: MarkerType.Arrow,
          color: 'hsl(var(--primary))'
        }
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
        className="bg-muted/30"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
