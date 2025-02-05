import { useState, useEffect, useRef } from 'react'
import { 
  GripVertical, 
  ChevronRight, 
  ChevronDown, 
  Lock,
  Info,
  ChevronsRight,
  AlertCircle,
  CheckCircle2,
  MoreVertical
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SectionContextMenu } from './section-context-menu'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/tooltip'
import { Entity } from '@/lib/types/entity'
import { Button } from '@/components/ui/button'

interface SectionItemProps {
  section: Entity
  level: number
  isExpanded: boolean
  onToggle: () => void
  onDragStart: (e: React.DragEvent, section: Entity) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, targetSection: Entity, dropPosition: 'inside' | 'before' | 'after') => void
}

export function SectionItem({ 
  section, 
  level,
  isExpanded, 
  onToggle,
  onDragStart,
  onDragOver,
  onDrop
}: SectionItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(section.name)
  const [showDescription, setShowDescription] = useState(false)
  const [dropTarget, setDropTarget] = useState<'inside' | 'before' | 'after' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { entities = [], updateEntity, addParentToEntity } = useOntologyStore()

  // Get all child entities (both sections and regular entities)
  const childEntities = entities.filter(e => e.parentId === section.id)
  
  // Separate sections from regular entities
  const childSections = childEntities
    .filter(e => e.isSection)
    .sort((a, b) => a.name.localeCompare(b.name))

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleDoubleClick = () => {
    setIsEditing(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditName(section.name)
    }
  }

  const handleSubmit = () => {
    if (editName.trim() && editName !== section.name) {
      updateEntity(section.id, { name: editName.trim() })
    }
    setIsEditing(false)
  }

  const handleBlur = () => {
    handleSubmit()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mouseY = e.clientY - rect.top

    if (mouseY < rect.height * 0.25) {
      setDropTarget('before')
    } else if (mouseY > rect.height * 0.75) {
      setDropTarget('after')
    } else {
      setDropTarget('inside')
    }

    onDragOver(e)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (dropTarget) {
      onDrop(e, section, dropTarget)
    }

    setDropTarget(null)
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', section.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOverInner = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDropInner = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId === section.id) return // Can't drop on itself

    // Add this section as a parent of the dragged section
    addParentToEntity(draggedId, section.id)
  }

  return (
    <div
      className={cn(
        'group relative',
        dropTarget === 'before' && 'before:absolute before:left-0 before:right-0 before:top-0 before:h-0.5 before:bg-primary',
        dropTarget === 'after' && 'after:absolute after:left-0 after:right-0 after:bottom-0 after:h-0.5 after:bg-primary'
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={(e) => e.preventDefault()}
    >
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-accent/50 transition-colors',
          dropTarget === 'inside' && 'bg-accent/50',
          level > 0 && 'ml-4'
        )}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className="p-1 cursor-grab hover:bg-accent rounded"
          draggable
          onDragStart={(e) => onDragStart(e, section)}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4"
          onClick={onToggle}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight
              className={cn('h-3 w-3 transition-transform', {
                'transform rotate-90': isExpanded
              })}
            />
          )}
        </Button>

        {isEditing ? (
          <Input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="h-8"
          />
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <span>{section.name}</span>
            {section.description && (
              <Tooltip content={section.description}>
                <Info className="h-4 w-4 text-muted-foreground" />
              </Tooltip>
            )}
          </div>
        )}

        <SectionContextMenu section={section} />
      </div>

      {isExpanded && childSections.length > 0 && (
        <div className="pl-4">
          {childSections.map(childSection => (
            <div
              key={childSection.id}
              className={cn(
                'group flex items-center gap-1 px-2 py-1 hover:bg-accent rounded-md cursor-pointer',
                { 'ml-4': level > 0 }
              )}
              draggable
              onDragStart={handleDragStart}
              onDragOver={handleDragOverInner}
              onDrop={handleDropInner}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={onToggle}
              >
                <ChevronRight
                  className={cn('h-3 w-3 transition-transform', {
                    'transform rotate-90': isExpanded
                  })}
                />
              </Button>

              <span className="flex-1">{childSection.name}</span>

              <SectionContextMenu section={childSection} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
