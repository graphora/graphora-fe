'use client'

import { useOntologyEditorStore } from '@/lib/store/ontology-editor-store'
import { Button } from '@/components/ui/button'
import { PlusCircle, FolderTree, FileDown, ChevronRight, ChevronDown } from 'lucide-react'
import yaml from 'js-yaml'
import { useState } from 'react'

interface EntityListProps {
  onLoadSample: () => void
}

export function EntityList({ onLoadSample }: EntityListProps) {
  const { yaml: yamlContent, updateFromYaml } = useOntologyEditorStore()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Parse YAML to get sections and entities
  const { sections, entities } = yamlContent ? (() => {
    try {
      const parsed = yaml.load(yamlContent) as any
      return {
        sections: Object.entries(parsed?.sections || {}),
        entities: Object.entries(parsed?.entities || {})
      }
    } catch (e) {
      console.error('Failed to parse YAML:', e)
      return { sections: [], entities: [] }
    }
  })() : { sections: [], entities: [] }

  const handleAddEntity = () => {
    const newEntity = {
      NewEntity: {
        properties: {
          name: {
            type: 'str',
            description: 'Description',
            unique: true,
            required: true
          }
        }
      }
    }
    
    try {
      const currentYaml = yamlContent || ''
      let parsed = {}
      
      try {
        parsed = yaml.load(currentYaml) || {}
      } catch (e) {
        console.error('Failed to parse current YAML:', e)
        parsed = {}
      }

      if (!parsed.entities) {
        parsed.entities = {}
      }

      parsed.entities = {
        ...parsed.entities,
        ...newEntity
      }

      const updatedYaml = yaml.dump(parsed, {
        indent: 2,
        lineWidth: -1,
        quotingType: '"'
      })
      
      updateFromYaml(updatedYaml)
    } catch (e) {
      console.error('Failed to add entity:', e)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {/* <Button variant="outline" className="w-full gap-2" onClick={handleAddEntity}>
          <PlusCircle className="h-4 w-4" />
          Add Entity
        </Button> */}
        <Button variant="outline" className="w-full gap-2" onClick={onLoadSample}>
          <FileDown className="h-4 w-4" />
          Load Sample
        </Button>
      </div>
      
      <div className="space-y-2">
        <div className="font-medium text-sm text-gray-500 mb-2">Sections</div>
        {sections.map(([name, items]) => (
          <div key={name} className="space-y-1">
            <div
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
              onClick={() => toggleSection(name)}
            >
              {expandedSections.has(name) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="text-sm">{name}</span>
            </div>
            {expandedSections.has(name) && Array.isArray(items) && (
              <div className="ml-6 space-y-1">
                {items.map((item: string) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
                  >
                    <FolderTree className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="font-medium text-sm text-gray-500 mt-4 mb-2">Entities</div>
        {entities.map(([name]) => (
          <div
            key={name}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <FolderTree className="h-4 w-4 text-blue-500" />
            <span className="text-sm">{name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
