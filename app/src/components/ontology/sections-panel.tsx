import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionItem } from './section-item'
import { AddSectionModal } from './add-section-modal'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { Entity } from '@/lib/types/entity'

export function SectionsPanel() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [draggedEntity, setDraggedEntity] = useState<Entity | null>(null)
  const { entities = [], moveEntity } = useOntologyStore()

  // Get root sections (no parent) sorted by name
  const rootSections = entities
    .filter(e => e.isSection && !e.parentId)
    .sort((a, b) => a.name.localeCompare(b.name))

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const handleDragStart = (e: React.DragEvent, section: Entity) => {
    e.stopPropagation()
    setDraggedEntity(section)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent, targetSection: Entity, position: 'inside' | 'before' | 'after') => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedEntity) return

    // Don't allow dropping on itself
    if (draggedEntity.id === targetSection.id) return

    // Don't allow dropping on a descendant
    const isDescendant = (parentId: string | null, childId: string): boolean => {
      if (!parentId) return false
      const parent = entities.find(e => e.id === parentId)
      if (!parent) return false
      const childEntities = entities.filter(e => e.parentId === parent.id)
      if (childEntities.some(e => e.id === childId)) return true
      return childEntities.some(e => isDescendant(e.id, childId))
    }

    if (isDescendant(draggedEntity.id, targetSection.id)) return

    // Determine the new parent based on drop position
    let newParentId: string | null = null
    if (position === 'inside') {
      newParentId = targetSection.id
    } else {
      // For before/after, we want to be siblings, so use the target's parent
      newParentId = targetSection.parentId
    }

    moveEntity(draggedEntity.id, newParentId)
    setDraggedEntity(null)
  }

  const renderSection = (section: Entity, level: number = 0) => {
    const isExpanded = expandedSections.has(section.id)
    const childSections = entities
      .filter(e => e.isSection && e.parentId === section.id)
      .sort((a, b) => a.name.localeCompare(b.name))

    return (
      <div key={section.id}>
        <SectionItem
          section={section}
          level={level}
          isExpanded={isExpanded}
          onToggle={() => toggleSection(section.id)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
        {isExpanded && childSections.length > 0 && (
          <div className="pl-4">
            {childSections.map(childSection => renderSection(childSection, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b">
        <h2 className="font-semibold">Sections</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsAddModalOpen(true)}
          title="Add Section"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {rootSections.map(section => renderSection(section))}
      </div>

      <AddSectionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  )
}
