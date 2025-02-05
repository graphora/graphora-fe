import { useState } from 'react'
import { FileText, FolderTree, AlertTriangle, Pencil, Plus, Trash2, Link2 } from 'lucide-react'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { AddEntityModal } from './add-entity-modal'
import { EditEntityModal } from './edit-entity-modal'
import { AddRelationshipModal } from './add-relationship-modal'
import { Entity } from '@/lib/types/entity'

export function OntologyTreeView() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const { 
    entities,
    selectedEntity,
    isLoading,
    loadingMessage,
    setSelectedEntity,
    deleteEntity
  } = useOntologyStore()
  const [editingEntity, setEditingEntity] = useState<string | null>(null)
  const [addingToParent, setAddingToParent] = useState<string | null>(null)
  const [addingRelationship, setAddingRelationship] = useState<string | null>(null)

  const handleEditEntity = (entityId: string) => {
    setEditingEntity(entityId)
  }

  const handleAddEntity = (parentId: string | null) => {
    setAddingToParent(parentId)
  }

  const handleDeleteEntity = (entityId: string) => {
    if (window.confirm('Are you sure you want to delete this entity?')) {
      deleteEntity(entityId)
    }
  }

  const handleAddRelationship = (entityId: string) => {
    setAddingRelationship(entityId)
  }

  const renderEntity = (entity: Entity, level: number, isLast: boolean) => {
    const propertyCount = entity.properties?.length || 0
    const relationshipCount = entity.relationships?.length || 0
    const isSection = entity.isSection

    return (
      <div 
        key={entity.id}
        className={cn(
          'relative flex items-center gap-2 py-1 pl-6 hover:bg-gray-50 cursor-pointer group',
          selectedEntity === entity.id && 'bg-blue-50 hover:bg-blue-50',
          'transition-colors duration-200',
          {
            'before:absolute before:left-2 before:top-[50%] before:w-3 before:h-px before:bg-gray-300': level > 0,
            'after:absolute after:left-2 after:top-0 after:w-px after:h-full after:bg-gray-300': !isLast && level > 0,
          }
        )}
        style={{ marginLeft: `${level * 24}px` }}
        onClick={() => setSelectedEntity(entity.id)}
      >
        {isSection ? (
          <FolderTree className="h-4 w-4 text-gray-400" />
        ) : (
          <FileText className="h-4 w-4 text-gray-400" />
        )}
        
        <span className="flex-1 font-medium">
          {entity.name}
        </span>
        
        <div className="flex items-center gap-2">
          {!isSection && propertyCount > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {propertyCount} prop{propertyCount === 1 ? '' : 's'}
            </span>
          )}
          
          {!isSection && relationshipCount > 0 && (
            <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
              {relationshipCount} rel{relationshipCount === 1 ? '' : 's'}
            </span>
          )}

          <div className="flex items-center opacity-0 group-hover:opacity-100">
            <Tooltip content="Edit">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditEntity(entity.id)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </Tooltip>
            
            {!isSection && (
              <Tooltip content="Add relationship">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddRelationship(entity.id)
                  }}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </Tooltip>
            )}

            {isSection && (
              <Tooltip content="Add entity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddEntity(entity.id)
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </Tooltip>
            )}

            <Tooltip content="Delete">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteEntity(entity.id)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    )
  }

  const renderEntityTree = (entity: Entity, level: number = 0) => {
    const childEntities = entities.filter(e => e.parentId === entity.id)
    const isLast = true // TODO: Implement proper last item detection if needed

    return (
      <div key={entity.id} className="space-y-1">
        {renderEntity(entity, level, isLast)}
        
        {childEntities.length > 0 && (
          <div className="space-y-1">
            {childEntities.map(child => renderEntityTree(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return <LoadingOverlay message={loadingMessage} />
  }

  const rootEntities = entities.filter(e => !e.parentId && e.isSection)

  if (rootEntities.length === 0) {
    return (
      <EmptyState
        icon={FolderTree}
        title="No sections yet"
        description="Start by adding a section to organize your entities"
        action={
          <Button onClick={() => handleAddEntity(null)}>
            Add Section
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {rootEntities
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(entity => renderEntityTree(entity))}

      <AddEntityModal
        isOpen={!!addingToParent}
        onClose={() => setAddingToParent(null)}
        initialParentId={addingToParent || undefined}
      />

      <EditEntityModal
        isOpen={!!editingEntity}
        onClose={() => setEditingEntity(null)}
        entityId={editingEntity || undefined}
      />

      <AddRelationshipModal
        open={!!addingRelationship}
        onOpenChange={(open) => {
          if (!open) setAddingRelationship(null)
        }}
        sourceEntity={addingRelationship ? entities.find(e => e.id === addingRelationship) : null}
      />
    </div>
  )
}
