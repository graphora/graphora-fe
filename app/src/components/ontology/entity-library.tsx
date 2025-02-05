import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddEntityModal } from './add-entity-modal'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { cn } from '@/lib/utils'
import { Entity } from '@/lib/types/entity'

export function EntityLibrary() {
  const { entities } = useOntologyStore()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [draggedEntity, setDraggedEntity] = useState<string | null>(null)

  const nonSectionEntities = entities.filter(e => !e.isSection)

  const handleDragStart = (e: React.DragEvent, entityId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'ENTITY',
      id: entityId
    }))
    setDraggedEntity(entityId)
  }

  const handleDragEnd = () => {
    setDraggedEntity(null)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b">
        <h2 className="font-semibold">Entities</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsAddModalOpen(true)}
          title="Add Entity"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {nonSectionEntities.map(entity => (
            <div
              key={entity.id}
              className={cn(
                'flex items-center justify-between text-sm px-2 py-1.5 rounded cursor-move transition-colors',
                'hover:bg-accent/50 active:bg-accent/70',
                draggedEntity === entity.id && 'opacity-50 bg-accent/30'
              )}
              draggable
              onDragStart={(e) => handleDragStart(e, entity.id)}
              onDragEnd={handleDragEnd}
            >
              <span>{entity.name}</span>
              {entity.type && (
                <span className="text-xs text-muted-foreground">
                  {entity.type}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <AddEntityModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  )
}
