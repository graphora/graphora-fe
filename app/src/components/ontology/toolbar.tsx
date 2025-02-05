import { Menu } from '@headlessui/react'
import { 
  ZoomIn, 
  ZoomOut, 
  ScanSearch, 
  Undo2, 
  Redo2, 
  LayoutTemplate,
  TreePine,
  Network,
  Plus,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { AddSectionModal } from './add-section-modal'
import { AddEntityModal } from './add-entity-modal'
import { useState } from 'react'

export function OntologyToolbar() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAddEntityModalOpen, setIsAddEntityModalOpen] = useState(false)
  const { 
    selectedView,
    setSelectedView,
    undo,
    redo
  } = useOntologyStore()

  return (
    <div className="h-10 border-b flex items-center px-2 gap-2 bg-white">
      <Button variant="ghost" size="icon">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon">
        <ScanSearch className="h-4 w-4" />
      </Button>

      <div className="h-5 w-px bg-gray-200" />

      <Button variant="ghost" size="icon" onClick={undo}>
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={redo}>
        <Redo2 className="h-4 w-4" />
      </Button>

      <div className="h-5 w-px bg-gray-200" />

      <Menu as="div" className="relative">
        <Menu.Button as={Button} variant="ghost" size="sm">
          <LayoutTemplate className="h-4 w-4 mr-1" />
          Templates
        </Menu.Button>
        <Menu.Items className="absolute left-0 mt-1 w-48 bg-white border rounded-md shadow-lg p-1 z-10">
          <Menu.Item>
            {({ active }) => (
              <button
                className={`${
                  active ? 'bg-gray-100' : ''
                } w-full text-left px-2 py-1 rounded`}
              >
                Basic Structure
              </button>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                className={`${
                  active ? 'bg-gray-100' : ''
                } w-full text-left px-2 py-1 rounded`}
              >
                Document Processing
              </button>
            )}
          </Menu.Item>
        </Menu.Items>
      </Menu>

      <div className="flex-1" />

      <div className="flex items-center rounded-md border p-0.5 gap-0.5">
        <Button
          variant={selectedView === 'tree' ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => setSelectedView('tree')}
        >
          <TreePine className="h-4 w-4" />
        </Button>
        <Button
          variant={selectedView === 'graph' ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => setSelectedView('graph')}
        >
          <Network className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddEntityModalOpen(true)}
        >
          <FileText className="h-4 w-4 mr-2" />
          Add Entity
        </Button>
      </div>

      <AddSectionModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <AddEntityModal
        isOpen={isAddEntityModalOpen}
        onClose={() => setIsAddEntityModalOpen(false)}
      />
    </div>
  )
}
