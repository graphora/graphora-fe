import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionItem } from './section-item'
import { AddSectionModal } from './add-section-modal'
import { useOntologyStore, type Section } from '@/lib/store/ontology-store'

export function SectionsPanel() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [draggedSection, setDraggedSection] = useState<Section | null>(null)
  const { sections, moveSection } = useOntologyStore()

  // Get root sections (no parent) sorted by order
  const rootSections = sections
    .filter(s => !s.parentId)
    .sort((a, b) => {
      if (a.isLocked && !b.isLocked) return -1
      if (!a.isLocked && b.isLocked) return 1
      return a.order - b.order
    })

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

  const handleDragStart = (e: React.DragEvent, section: Section) => {
    if (section.isLocked) return
    setDraggedSection(section)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetSection: Section, dropPosition: 'inside' | 'before' | 'after') => {
    e.preventDefault()
    
    if (!draggedSection || draggedSection.id === targetSection.id || draggedSection.isLocked) {
      return
    }

    switch (dropPosition) {
      case 'inside':
        moveSection(draggedSection.id, targetSection.id)
        break
      case 'before':
      case 'after':
        // If dropping before/after a root section, move to root
        if (!targetSection.parentId) {
          moveSection(draggedSection.id, null)
        } else {
          // If dropping before/after a child section, move to same parent
          moveSection(draggedSection.id, targetSection.parentId)
        }
        break
    }

    setDraggedSection(null)
  }

  return (
    <div className="w-[300px] border-r flex flex-col h-full bg-white">
      <div className="h-6 flex items-center justify-between px-3 border-b">
        <h2 className="text-sm font-medium">Sections</h2>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">
            {sections.length} section{sections.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1">
        {rootSections.map((section) => (
          <SectionItem
            key={section.id}
            section={section}
            level={0}
            isExpanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}
      </div>

      <div className="p-2 border-t">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>

      <AddSectionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  )
}
