import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Entity } from '@/lib/types/entity'

interface EntityNodeProps {
  data: {
    entity: Entity
  }
  selected?: boolean
}

export const EntityNode = memo(({ data, selected }: EntityNodeProps) => {
  const { entity } = data

  return (
    <div
      className={`
        px-4 py-2 rounded-md border shadow-sm
        ${selected ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200'}
      `}
    >
      <Handle type="target" position={Position.Top} />
      <div className="font-medium">{entity.name}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
})
