import { useMemo } from 'react'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { Entity } from '@/lib/types/entity'

function buildYamlTree(entities: Entity[]) {
  const entityMap = new Map(entities.map(e => [e.id, e]))

  // Helper to get child sections
  function getChildSections(parentId: string): Entity[] {
    return entities.filter(e => 
      e.isSection && e.parentIds?.includes(parentId)
    )
  }

  // Helper to get child entities
  function getChildEntities(sectionId: string): Entity[] {
    return entities.filter(e => 
      !e.isSection && e.parentIds?.includes(sectionId)
    )
  }

  // Build nested sections recursively
  function buildSectionTree(section: Entity, indent: number = 2): string {
    const spaces = ' '.repeat(indent)
    let yaml = `${spaces}${section.name}:`
    
    const childEntities = getChildEntities(section.id)
    const childSections = getChildSections(section.id)
    
    if (childEntities.length > 0) {
      yaml += '\n'
      childEntities.forEach(entity => {
        yaml += `${spaces}  - ${entity.name}\n`
      })
    } else if (childSections.length > 0) {
      yaml += '\n'
    } else {
      yaml += '\n'
    }

    // Add child sections
    childSections.forEach(childSection => {
      yaml += buildSectionTree(childSection, indent + 2)
    })

    return yaml
  }

  // Build entity definition
  function buildEntityDefinition(entity: Entity): string {
    let yaml = `  ${entity.name}:\n`
    
    // Add properties
    if (entity.properties && Object.keys(entity.properties).length > 0) {
      yaml += '    properties:\n'
      Object.entries(entity.properties).forEach(([propName, prop]) => {
        yaml += `      ${propName}:\n`
        yaml += `        type: ${prop.type || 'str'}\n`
        if (prop.description) {
          yaml += `        description: ${prop.description}\n`
        }
        if (prop.required) {
          yaml += `        required: true\n`
        }
        if (prop.index) {
          yaml += `        index: true\n`
        }
        if (prop.unique) {
          yaml += `        unique: true\n`
        }
      })
    }

    // Add relationships
    if (entity.relationships && Object.keys(entity.relationships).length > 0) {
      yaml += '    relationships:\n'
      Object.entries(entity.relationships).forEach(([relName, rel]) => {
        yaml += `      ${relName}:\n`
        yaml += `        target: ${rel.target}\n`
      })
    }

    return yaml
  }

  // Start building the YAML
  let yaml = 'sections:\n'
  
  // Add root sections (sections without parents)
  const rootSections = entities.filter(e => 
    e.isSection && (!e.parentIds || e.parentIds.length === 0)
  )
  rootSections.forEach(section => {
    yaml += buildSectionTree(section)
  })

  // Add all entities definitions (including sections) under entities
  yaml += '\nentities:\n'
  entities.forEach(entity => {
    yaml += buildEntityDefinition(entity)
  })

  return yaml
}

export function YAMLPreview() {
  const { entities } = useOntologyStore()
  
  const yamlContent = useMemo(() => buildYamlTree(entities), [entities])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b">
        <h2 className="font-semibold">YAML Preview</h2>
      </div>
      <pre className="flex-1 p-4 overflow-auto font-mono text-sm">
        {yamlContent}
      </pre>
    </div>
  )
}
