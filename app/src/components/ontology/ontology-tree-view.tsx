import { useEffect, useState } from 'react'
import { FileText, FolderTree, AlertTriangle, Pencil, Plus, Trash2, Link2 } from 'lucide-react'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { AddSectionModal } from './add-section-modal'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { AddEntityModal } from './add-entity-modal'
import { EditEntityModal } from './edit-entity-modal'
import { AddRelationshipModal } from './add-relationship-modal'

export function OntologyTreeView() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const { 
    sections, 
    entities,
    selectedEntity,
    isLoading,
    loadingMessage,
    setSelectedEntity,
    validateSection,
    deleteEntity
  } = useOntologyStore()
  const [editingEntity, setEditingEntity] = useState<string | null>(null)
  const [addingToSection, setAddingToSection] = useState<string | null>(null)
  const [addingRelationship, setAddingRelationship] = useState<string | null>(null)

  const handleEditEntity = (entityId: string) => {
    setEditingEntity(entityId)
  }

  const handleAddEntity = (sectionId: string) => {
    setAddingToSection(sectionId)
  }

  const handleDeleteEntity = (entityId: string) => {
    if (window.confirm('Are you sure you want to delete this entity?')) {
      deleteEntity(entityId)
    }
  }

  const handleAddRelationship = (entityId: string) => {
    setAddingRelationship(entityId)
  }

  // Validate all sections only on mount
  useEffect(() => {
    // Create a Set to track which sections have been validated
    const validatedSections = new Set<string>()
    
    sections.forEach(section => {
      if (!validatedSections.has(section.id)) {
        validatedSections.add(section.id)
        validateSection(section.id)
      }
    })
  }, []) // Empty dependency array to run only on mount

  const renderEntity = (entity: any, level: number, isLast: boolean) => {
    const propertyCount = entity.properties.length
    const relationshipCount = entity.relationships.length
    const hasValidationIssues = false // TODO: Add validation logic

    return (
      <div 
        key={entity.id}
        className={cn(
          'relative flex items-center gap-2 py-1 pl-6 hover:bg-gray-50 cursor-pointer group',
          selectedEntity === entity.id && 'bg-blue-50 hover:bg-blue-50',
          'transition-colors duration-200',
          {
            'before:absolute before:left-2 before:top-[50%] before:w-3 before:h-px before:bg-gray-300': true,
            'after:absolute after:left-2 after:top-0 after:w-px after:h-full after:bg-gray-300': !isLast,
          }
        )}
        style={{ marginLeft: `${level * 24}px` }}
        onClick={() => setSelectedEntity(entity.id)}
      >
        <FileText className="h-4 w-4 text-gray-400" />
        <span className={cn(
          'flex-1',
          entity.properties.some(p => p.flags.required) && 'font-medium'
        )}>
          {entity.name}
        </span>
        
        <div className="flex items-center gap-2">
          {propertyCount > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {propertyCount} prop{propertyCount === 1 ? '' : 's'}
            </span>
          )}
          
          {relationshipCount > 0 && (
            <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
              {relationshipCount} rel{relationshipCount === 1 ? '' : 's'}
            </span>
          )}

          {hasValidationIssues && (
            <Tooltip content="This entity has validation issues">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </Tooltip>
          )}

          <div className="flex items-center opacity-0 group-hover:opacity-100">
            <Tooltip content="Edit entity">
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
            <Tooltip content="Add property">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleAddEntity(entity.section)
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </Tooltip>
            <Tooltip content="Delete entity">
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

  const renderSection = (section: any, level: number = 0) => {
    const sectionEntities = entities.filter(e => e.section === section.id)
    const childSections = sections
      .filter(s => s.parentId === section.id)
      .sort((a, b) => a.order - b.order)

    return (
      <div key={section.id} className="space-y-1">
        <div 
          className={cn(
            'flex items-center gap-2 p-2 rounded-md',
            section.type === 'system' && 'border-l-4 border-blue-400',
            section.type === 'mandatory' && 'border-l-4 border-purple-400',
            !section.isValid && 'bg-red-50/50'
          )}
          style={{ marginLeft: `${level * 24}px` }}
        >
          <FolderTree className="h-4 w-4 text-gray-400" />
          <span className="flex-1 font-medium">{section.name}</span>
          <span className="text-xs text-gray-500">
            {sectionEntities.length} entit{sectionEntities.length === 1 ? 'y' : 'ies'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAddEntity(section.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1 ml-4">
          {sectionEntities.map((entity, index) => renderEntity(entity, level + 1, index === sectionEntities.length - 1))}
        </div>

        {childSections.map(childSection => renderSection(childSection, level + 1))}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {sections
        .filter(section => !section.parentId)
        .sort((a, b) => {
          if (a.isLocked && !b.isLocked) return -1
          if (!a.isLocked && b.isLocked) return 1
          return a.order - b.order
        })
        .map(section => renderSection(section))}

      <AddEntityModal
        isOpen={!!addingToSection}
        onClose={() => setAddingToSection(null)}
        initialSection={addingToSection || undefined}
      />

      <EditEntityModal
        isOpen={!!editingEntity}
        onClose={() => setEditingEntity(null)}
        entityId={editingEntity || undefined}
      />

      <AddRelationshipModal
        isOpen={!!addingRelationship}
        onClose={() => setAddingRelationship(null)}
        initialSourceId={addingRelationship || undefined}
      />
    </div>
  )
}
