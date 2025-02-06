import React, { useState, useCallback } from 'react'
import { ChevronRight, MoreVertical, Plus, GripVertical, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useOntologyStore } from '@/lib/store/ontology-store'
import { Entity } from '@/lib/types/entity'
import { cn } from '@/lib/utils'
import { AddSectionModal } from './add-section-modal'
import { AddEntityModal } from './add-entity-modal'
import { AddRelationshipModal } from './add-relationship-modal'

interface SectionNodeProps {
  section: Entity
  level: number
  isExpanded: boolean
  onToggle: () => void
  onDrop: (e: React.DragEvent, position: 'before' | 'inside' | 'after') => void
}

function SectionNode({ section, level, isExpanded, onToggle, onDrop }: SectionNodeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [dropTarget, setDropTarget] = useState<'before' | 'inside' | 'after' | null>(null)
  const [isAddEntityModalOpen, setIsAddEntityModalOpen] = useState(false)
  const { entities, updateEntity, deleteEntity } = useOntologyStore()

  const childEntities: any[] = entities.filter(e => 
    !e.isSection && e.parentIds?.includes(section.id)
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top

    // Determine drop position based on mouse location
    if (y < rect.height * 0.25) {
      setDropTarget('before')
    } else if (y > rect.height * 0.75) {
      setDropTarget('after')
    } else {
      setDropTarget('inside')
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'SECTION',
      id: section.id,
      level: section.level
    }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (dropTarget) {
      onDrop(e, dropTarget)
    }

    setDropTarget(null)
  }

  const handleDelete = () => {
    if (childEntities.length > 0) {
      alert('Cannot delete section with entities')
      return
    }
    deleteEntity(section.id)
  }

  return (
    <div
      className={cn(
        'relative',
        level > 0 && 'ml-6 before:absolute before:left-[-1.25rem] before:top-0 before:h-full before:w-px before:bg-border'
      )}
    >
      <div
        className={cn(
          'group flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors',
          dropTarget === 'inside' && 'bg-accent/50',
          dropTarget === 'before' && 'border-t-2 border-primary',
          dropTarget === 'after' && 'border-b-2 border-primary'
        )}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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

        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

        {isEditing ? (
          <Input
            value={section.name}
            onChange={(e) => updateEntity(section.id, { name: e.target.value })}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
            className="h-7 w-40"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 cursor-pointer"
            onDoubleClick={() => setIsEditing(true)}
          >
            {section.name}
          </span>
        )}

        <Badge variant="secondary" className="text-xs">
          {childEntities.length}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => setIsEditing(true)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIsAddEntityModalOpen(true)}>
              Add Entity
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={handleDelete}
              className="text-destructive"
              disabled={childEntities.length > 0}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isExpanded && (
        <div className="py-1 space-y-1">
          {childEntities.map(entity => (
            <div
              key={entity.id}
              className="ml-6 p-2 rounded-md hover:bg-accent/50 flex items-center gap-2"
            >
              <span className="flex-1">{entity.name}</span>
              <Badge variant="outline" className="text-xs">
                {entity.type}
              </Badge>
            </div>
          ))}
        </div>
      )}

      <AddEntityModal
        isOpen={isAddEntityModalOpen}
        onClose={() => setIsAddEntityModalOpen(false)}
        defaultSection={section}
      />
    </div>
  )
}

export function VisualEditor() {
  const { entities, moveEntity, deleteEntity } = useOntologyStore()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false)
  const [isAddRelationshipOpen, setIsAddRelationshipOpen] = useState(false)
  const [isAddEntityOpen, setIsAddEntityOpen] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)

  const sections = entities.filter(e => e.isSection)
  const rootSections = sections.filter(s => !s.parentIds?.length)

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const handleDragStart = (e: React.DragEvent, entityId: string, type: 'SECTION' | 'ENTITY') => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type,
      id: entityId
    }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetSectionId: string | null) => {
    e.preventDefault()
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type === 'SECTION' || data.type === 'ENTITY') {
        moveEntity(data.id, targetSectionId)
      }
    } catch (error) {
      console.error('Error handling drop:', error)
    }
  }

  const getChildSections = (parentId: string) => {
    return sections.filter(s => s.parentIds?.includes(parentId))
  }

  const handleDeleteSection = (sectionId: string) => {
    const section = entities.find(e => e.id === sectionId)
    if (!section) return

    // Check if section has children
    const hasChildren = entities.some(e => e.parentIds?.includes(sectionId))
    if (hasChildren) {
      alert('Cannot delete section with children. Please remove or move children first.')
      return
    }

    deleteEntity(sectionId)
  }

  const renderSection = (section: Entity, level: number = 0) => {
    const childSections = getChildSections(section.id)
    const childEntities = entities.filter(e => !e.isSection && e.parentIds?.includes(section.id))
    const isExpanded = expandedSections.has(section.id)

    return (
      <div key={section.id} className="space-y-1">
        <div
          className={cn(
            'flex items-center justify-between group rounded hover:bg-accent/50',
            'transition-colors',
            { 'bg-accent/50': selectedSectionId === section.id }
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, section.id)}
        >
          <div 
            className="flex items-center gap-2 flex-1 py-1 cursor-pointer"
            onClick={() => toggleSection(section.id)}
            draggable
            onDragStart={(e) => handleDragStart(e, section.id, 'SECTION')}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
            <span>{section.name}</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setSelectedSectionId(section.id)
                setIsAddSectionOpen(true)
              }}>
                Add Subsection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setEditingEntity(section)
                setIsAddSectionOpen(true)
              }}>
                Edit Section
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDeleteSection(section.id)}
                className="text-red-600"
              >
                Delete Section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && (
          <div className="space-y-1">
            {childEntities.map(entity => (
              <div
                key={entity.id}
                className="flex items-center justify-between py-1 px-2 hover:bg-accent/50 rounded group"
                style={{ marginLeft: `${(level + 1) * 16}px` }}
              >
                <span className="text-sm">{entity.name}</span>
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
                        setIsAddEntityOpen(true)
                      }}>
                        Edit Entity
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteEntity(entity.id)}
                        className="text-red-600"
                      >
                        Delete Entity
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => moveEntity(entity.id, null)}>
                        Remove from Section
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {childSections.map(childSection => renderSection(childSection, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const handleSectionModalClose = () => {
    setIsAddSectionOpen(false)
    setSelectedSectionId(null)
    setEditingEntity(null)
  }

  const handleEntityModalClose = () => {
    setIsAddEntityOpen(false)
    setEditingEntity(null)
  }

  const handleRelationshipModalClose = () => {
    setIsAddRelationshipOpen(false)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b">
        <h2 className="font-semibold">Visual Editor</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedSectionId(null)
              setEditingEntity(null)
              setIsAddSectionOpen(true)
            }}
          >
            Add Section
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setIsAddRelationshipOpen(true)
            }}
          >
            Add Relationship
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {rootSections.map(section => renderSection(section))}
        </div>
      </div>

      <AddSectionModal
        isOpen={isAddSectionOpen}
        onClose={handleSectionModalClose}
        parentSectionId={selectedSectionId}
        editSection={editingEntity}
      />
      <AddRelationshipModal
        isOpen={isAddRelationshipOpen}
        onClose={handleRelationshipModalClose}
      />
      <AddEntityModal
        isOpen={isAddEntityOpen}
        onClose={handleEntityModalClose}
        editEntity={editingEntity}
        defaultSection={selectedSectionId}
      />
    </div>
  )
}
