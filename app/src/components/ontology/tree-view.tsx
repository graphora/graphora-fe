import { useState } from 'react'
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react'
import { useOntologyStore } from '@/lib/store/ontology-store'

export function TreeView() {
  const { sections, entities, selectedEntity, setSelectedEntity } = useOntologyStore()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

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

  const handleDragStart = (e: React.DragEvent, entityId: string) => {
    e.dataTransfer.setData('text/plain', entityId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault()
    const entityId = e.dataTransfer.getData('text/plain')
    // Handle entity move logic here
  }

  return (
    <div className="flex-1 overflow-auto p-2">
      {sections.map((section) => {
        const isExpanded = expandedSections.has(section.id)
        const sectionEntities = entities.filter((e) => e.section === section.id)

        return (
          <div
            key={section.id}
            className="mb-2"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, section.id)}
          >
            <div
              className="flex items-center gap-1 p-1 rounded hover:bg-gray-100 cursor-pointer"
              onClick={() => toggleSection(section.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
              <span className="font-medium">{section.name}</span>
              <span className="text-gray-400 text-sm">({sectionEntities.length})</span>
            </div>

            {isExpanded && (
              <div className="ml-6 space-y-1 mt-1">
                {sectionEntities.map((entity) => (
                  <div
                    key={entity.id}
                    className={`flex items-center gap-2 p-1 rounded cursor-pointer ${
                      selectedEntity === entity.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedEntity(entity.id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, entity.id)}
                  >
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <span>{entity.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
