import { useState, useEffect, useRef } from 'react'
import { 
  GripVertical, 
  ChevronRight, 
  ChevronDown, 
  Lock,
  Info,
  ChevronsRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SectionContextMenu } from './section-context-menu'
import { useOntologyStore, type Section } from '@/lib/store/ontology-store'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/tooltip'

interface SectionItemProps {
  section: Section
  level: number
  isExpanded: boolean
  onToggle: () => void
  onDragStart: (e: React.DragEvent, section: Section) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, targetSection: Section, dropPosition: 'inside' | 'before' | 'after') => void
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
  const { sections, entities, updateSection, validateSection } = useOntologyStore()

  const sectionEntities = entities.filter(e => e.section === section.id)
  const childSections = sections.filter(s => s.parentId === section.id)
    .sort((a, b) => a.order - b.order)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    validateSection(section.id)
  }, [section.id, section.name, section.entities, section.parentId])

  const handleDoubleClick = () => {
    if (!section.isLocked) {
      setIsEditing(true)
    }
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
      updateSection(section.id, { name: editName.trim() })
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

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  return (
    <div>
      <div 
        className={cn(
          'group relative',
          section.isLocked && 'bg-gray-50',
          dropTarget === 'before' && 'border-t-2 border-blue-500',
          dropTarget === 'after' && 'border-b-2 border-blue-500',
          'my-1 first:mt-0 last:mb-0'
        )}
        style={{ marginLeft: `${level * 24}px` }}
        draggable={!section.isLocked}
        onDragStart={(e) => onDragStart(e, section)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
      >
        <div 
          className={cn(
            'flex items-center gap-2 p-2 rounded-md',
            isEditing && 'bg-gray-100',
            !isEditing && 'hover:bg-gray-50',
            section.type === 'system' && 'border-l-4 border-blue-400',
            section.type === 'mandatory' && 'border-l-4 border-purple-400',
            dropTarget === 'inside' && 'ring-2 ring-blue-500',
            !section.isValid && 'bg-red-50/50'
          )}
        >
          <div className="flex items-center gap-1">
            {level > 0 && (
              <ChevronsRight className="h-4 w-4 text-gray-300" />
            )}
            <button
              className="p-1 hover:bg-gray-100 rounded"
              onClick={onToggle}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          </div>

          <div className="flex-1 flex items-center gap-2">
            {!section.isLocked && (
              <GripVertical 
                className="h-4 w-4 text-gray-400 invisible group-hover:visible cursor-grab active:cursor-grabbing" 
              />
            )}
            
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className={cn(
                  "h-7 py-0",
                  !section.isValid && "border-red-300 focus-visible:ring-red-400"
                )}
              />
            ) : (
              <div
                onDoubleClick={handleDoubleClick}
                className="flex-1 flex items-center gap-2"
              >
                <span className="flex-1">{section.name}</span>
                {section.description && (
                  <button
                    className="p-1 hover:bg-gray-100 rounded"
                    onClick={() => setShowDescription(!showDescription)}
                  >
                    <Info className="h-4 w-4 text-gray-400" />
                  </button>
                )}
                {section.isLocked && (
                  <Lock className="h-3 w-3 text-gray-400" />
                )}
                <div className="flex items-center gap-2">
                  {section.validationErrors && section.validationErrors.length > 0 ? (
                    <Tooltip content={section.validationErrors[0].message}>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    </Tooltip>
                  ) : section.isValid && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  <div className="flex items-center gap-1 border-l pl-2">
                    <span 
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        section.type === 'mandatory' && 'bg-purple-100 text-purple-700',
                        section.type === 'system' && 'bg-blue-100 text-blue-700',
                        section.type === 'custom' && 'bg-gray-100 text-gray-700'
                      )}
                    >
                      {sectionEntities.length}
                    </span>
                    {childSections.length > 0 && (
                      <span className="text-xs text-gray-500">
                        +{childSections.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <SectionContextMenu section={section} />
        </div>

        {showDescription && section.description && (
          <div className="ml-11 mr-2 mt-1 mb-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
            {section.description}
          </div>
        )}

        {section.validationErrors && section.validationErrors.length > 0 && (
          <div className="ml-11 mr-2 mt-1 mb-2 text-sm text-red-600 bg-red-50 p-2 rounded">
            <ul className="list-disc list-inside space-y-1">
              {section.validationErrors.map((error, index) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {isExpanded && childSections.length > 0 && (
        <div className="space-y-1 border-l border-gray-200 ml-[24px]">
          {childSections.map((childSection) => (
            <SectionItem
              key={childSection.id}
              section={childSection}
              level={level + 1}
              isExpanded={false}
              onToggle={onToggle}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  )
}
