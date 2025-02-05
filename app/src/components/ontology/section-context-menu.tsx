import { Menu } from '@headlessui/react'
import { 
  Pencil, 
  Trash2, 
  MoveUp, 
  MoveDown,
  MoreVertical,
  Plus
} from 'lucide-react'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { Entity } from '@/lib/types/entity'
import { useState } from 'react'
import { AddEntityModal } from './add-entity-modal'

interface SectionContextMenuProps {
  section: Entity
}

export function SectionContextMenu({ section }: SectionContextMenuProps) {
  const [isAddEntityModalOpen, setIsAddEntityModalOpen] = useState(false)
  const { entities = [], deleteEntity, moveEntity } = useOntologyStore()

  // Get all sections at the same level (siblings)
  const siblingEntities = entities.filter(e => 
    e.isSection && 
    e.parentId === section.parentId
  ).sort((a, b) => a.name.localeCompare(b.name))

  const currentIndex = siblingEntities.findIndex(s => s.id === section.id)

  const handleMoveUp = () => {
    if (currentIndex > 0) {
      const targetSection = siblingEntities[currentIndex - 1]
      moveEntity(section.id, targetSection.parentId)
    }
  }

  const handleMoveDown = () => {
    if (currentIndex < siblingEntities.length - 1) {
      const targetSection = siblingEntities[currentIndex + 1]
      moveEntity(section.id, targetSection.parentId)
    }
  }

  if (section.isLocked) {
    return null
  }

  return (
    <>
      <Menu as="div" className="relative">
        <Menu.Button className="p-1 hover:bg-gray-100 rounded">
          <MoreVertical className="h-4 w-4 text-gray-500" />
        </Menu.Button>

        <Menu.Items className="absolute right-0 mt-1 w-48 bg-white border rounded-md shadow-lg p-1 z-10">
          <Menu.Item>
            {({ active }) => (
              <button
                className={`${
                  active ? 'bg-gray-100' : ''
                } w-full text-left px-2 py-1 rounded flex items-center gap-2`}
                onClick={handleMoveUp}
                disabled={currentIndex <= 0}
              >
                <MoveUp className="h-4 w-4" />
                Move Up
              </button>
            )}
          </Menu.Item>

          <Menu.Item>
            {({ active }) => (
              <button
                className={`${
                  active ? 'bg-gray-100' : ''
                } w-full text-left px-2 py-1 rounded flex items-center gap-2`}
                onClick={handleMoveDown}
                disabled={currentIndex >= siblingEntities.length - 1}
              >
                <MoveDown className="h-4 w-4" />
                Move Down
              </button>
            )}
          </Menu.Item>

          <div className="h-px bg-gray-200 my-1" />

          <Menu.Item>
            {({ active }) => (
              <button
                className={`${
                  active ? 'bg-gray-100' : ''
                } w-full text-left px-2 py-1 rounded flex items-center gap-2`}
                onClick={() => setIsAddEntityModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add Entity
              </button>
            )}
          </Menu.Item>

          <Menu.Item>
            {({ active }) => (
              <button
                className={`${
                  active ? 'bg-gray-100' : ''
                } w-full text-left px-2 py-1 rounded flex items-center gap-2 text-red-600`}
                onClick={() => deleteEntity(section.id)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </Menu.Item>
        </Menu.Items>
      </Menu>

      <AddEntityModal
        isOpen={isAddEntityModalOpen}
        onClose={() => setIsAddEntityModalOpen(false)}
        parentSectionId={section.id}
      />
    </>
  )
}
