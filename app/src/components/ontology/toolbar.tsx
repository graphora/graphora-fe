import { 
  ZoomIn, 
  ZoomOut, 
  ScanSearch, 
  Undo2, 
  Redo2, 
  TreePine,
  Network,
  Plus,
  FileText,
  Settings,
  FileDown,
  Grid2X2,
  Share2,
  List
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { AddEntityModal } from './add-entity-modal'
import { useState } from 'react'

interface OntologyToolbarProps {
  onViewChange: (view: 'tree' | 'graph') => void
  currentView: 'tree' | 'graph'
}

export function OntologyToolbar({ onViewChange, currentView }: OntologyToolbarProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const { 
    undo,
    redo
  } = useOntologyStore()

  return (
    <div className="h-12 border-b flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={undo}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={redo}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-2" />
        <Button variant="ghost" size="icon">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <ScanSearch className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={currentView === 'tree' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('tree')}
        >
          <List className="h-4 w-4 mr-2" />
          Tree View
        </Button>
        <Button
          variant={currentView === 'graph' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('graph')}
        >
          <Network className="h-4 w-4 mr-2" />
          Graph View
        </Button>
        <Button variant="ghost" size="icon">
          <Grid2X2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <FileDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsAddModalOpen(true)}
          title="Add Entity or Section"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <AddEntityModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  )
}
