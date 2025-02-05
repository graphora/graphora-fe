import { useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { stringify } from 'yaml'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { OntologyToolbar } from './ontology/toolbar'
import { SectionsPanel } from './ontology/sections-panel'
import { OntologyTreeView } from './ontology/ontology-tree-view'
import { LoadingOverlay } from './ui/loading-overlay'
import { GraphView } from '@/components/ontology/graph-view'
import { StatusBar } from '@/components/ontology/status-bar'
import { validateOntologyYaml } from '@/lib/yaml-validator'

interface OntologyBuilderProps {
  onValidYamlChange: (yaml: string) => void
}

export function OntologyBuilder({ onValidYamlChange }: OntologyBuilderProps) {
  const { sections, entities, selectedView, isLoading, loadingMessage } = useOntologyStore()

  useEffect(() => {
    // Convert the current state to YAML
    const yaml = stringify({
      sections: sections.reduce((acc, section) => {
        acc[section.name] = section.entities.map(
          (entityId) => entities.find((e) => e.id === entityId)?.name
        )
        return acc
      }, {} as Record<string, string[]>),
      entities: entities.reduce((acc, entity) => {
        acc[entity.name] = {
          properties: entity.properties,
          relationships: entity.relationships
        }
        return acc
      }, {} as Record<string, any>)
    })

    const validation = validateOntologyYaml(yaml)
    if (validation.isValid) {
      onValidYamlChange(yaml)
    }
  }, [sections, entities, onValidYamlChange])

  return (
    <div className="flex flex-col h-screen">
      <OntologyToolbar />
      
      <div className="flex-1 flex overflow-hidden">
        <SectionsPanel />
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {selectedView === 'tree' ? <OntologyTreeView /> : <GraphView />}
          <StatusBar />
        </div>
      </div>

      <LoadingOverlay 
        isLoading={isLoading} 
        message={loadingMessage} 
      />
    </div>
  )
}
