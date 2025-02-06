import React, { useState } from 'react'
import { Plus, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddEntityModal } from './add-entity-modal'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { cn } from '@/lib/utils'
import { Entity } from '@/lib/types/entity'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function EntityLibrary() {
  const { entities, deleteEntity } = useOntologyStore()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [draggedEntity, setDraggedEntity] = useState<string | null>(null)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)

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

  const handleDeleteEntity = (entityId: string) => {
    const entity = entities.find(e => e.id === entityId)
    if (!entity) return

    // Check if entity is used in relationships
    const isUsedInRelationships = entities.some(
      rel => rel.sourceId === entityId || rel.targetId === entityId
    )
    if (isUsedInRelationships) {
      alert('Cannot delete entity that is used in relationships. Please remove relationships first.')
      return
    }

    deleteEntity(entityId)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b">
        <h2 className="font-semibold">Entities</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setEditingEntity(null)
            setIsAddModalOpen(true)
          }}
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
                'flex items-center justify-between text-sm px-2 py-1.5 rounded cursor-move transition-colors group',
                'hover:bg-accent/50 active:bg-accent/70',
                draggedEntity === entity.id && 'opacity-50 bg-accent/30'
              )}
              draggable
              onDragStart={(e) => handleDragStart(e, entity.id)}
              onDragEnd={handleDragEnd}
            >
              <span>{entity.name}</span>
              <div className="flex items-center gap-1">
                {entity.type && (
                  <span className="text-xs text-muted-foreground">
                    {entity.type}
                  </span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setEditingEntity(entity)
                      setIsAddModalOpen(true)
                    }}>
                      Edit Entity
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteEntity(entity.id)}
                      className="text-red-600"
                    >
                      Delete Entity
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AddEntityModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingEntity(null)
        }}
        editEntity={editingEntity}
      />
    </div>
  )
}
