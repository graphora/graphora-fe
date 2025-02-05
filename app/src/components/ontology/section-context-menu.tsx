import { Menu } from '@headlessui/react'
import { 
  Pencil, 
  Trash2, 
  MoveUp, 
  MoveDown,
  MoreVertical
} from 'lucide-react'
import { useOntologyStore, type Section } from '@/lib/store/ontology-store'

interface SectionContextMenuProps {
  section: Section
}

export function SectionContextMenu({ section }: SectionContextMenuProps) {
  const { removeSection, reorderSection, sections } = useOntologyStore()

  const handleMoveUp = () => {
    const newOrder = Math.max(section.order - 1, sections.filter(s => s.isLocked).length)
    reorderSection(section.id, newOrder)
  }

  const handleMoveDown = () => {
    const newOrder = Math.min(section.order + 1, sections.length - 1)
    reorderSection(section.id, newOrder)
  }

  if (section.isLocked) {
    return null
  }

  return (
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
              disabled={section.order <= sections.filter(s => s.isLocked).length}
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
              disabled={section.order >= sections.length - 1}
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
              } w-full text-left px-2 py-1 rounded flex items-center gap-2 text-red-600`}
              onClick={() => removeSection(section.id)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </Menu.Item>
      </Menu.Items>
    </Menu>
  )
}
