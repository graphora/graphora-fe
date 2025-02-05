import { useState, useEffect } from 'react'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { useOntologyValidation } from '@/hooks/useOntologyValidation'
import { OntologyToolbar } from './ontology/toolbar'
import { GraphView } from '@/components/ontology/graph-view'
import { StatusBar } from '@/components/ontology/status-bar'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { EntityLibrary } from './ontology/entity-library'
import { VisualEditor } from './ontology/visual-editor'

interface OntologyBuilderProps {
  onValidYamlChange: (yaml: string) => void
}

export function OntologyBuilder({ onValidYamlChange }: OntologyBuilderProps) {
  const { validation, validateOntology } = useOntologyValidation({
    onValidYamlChange,
  })
  const { entities, relationships } = useOntologyStore()
  const [layout, setLayout] = useState([20, 60, 20])
  const [currentView, setCurrentView] = useState<'tree' | 'graph'>('tree')

  useEffect(() => {
    validateOntology({
      entities,
      relationships,
    })
  }, [entities, relationships])

  return (
    <div className="h-full flex flex-col bg-background">
      <OntologyToolbar onViewChange={setCurrentView} currentView={currentView} />
      
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={layout[0]} minSize={15} maxSize={30}>
            <div className="h-full border-r">
              <EntityLibrary />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={layout[1]} minSize={40}>
            <div className="h-full">
              {currentView === 'tree' ? (
                <VisualEditor />
              ) : (
                <div className="h-full w-full">
                  <GraphView />
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={layout[2]} minSize={15} maxSize={30}>
            <div className="h-full border-l">
              <StatusBar validation={validation} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
