import { useMemo } from 'react'
import { useOntologyStore } from '@/lib/store/ontology-store'
import { Entity } from '@/lib/types/entity'

function buildYamlTree(entities: Entity[]) {
  // First, separate sections and non-section entities
  const sections = entities.filter(e => e.isSection)
  const nonSectionEntities = entities.filter(e => !e.isSection)

  // Build a map of section ID to its entities
  const sectionToEntities = new Map<string, Entity[]>()
  nonSectionEntities.forEach(entity => {
    if (entity.parentIds) {
      entity.parentIds.forEach(parentId => {
        if (!sectionToEntities.has(parentId)) {
          sectionToEntities.set(parentId, [])
        }
        sectionToEntities.get(parentId)!.push(entity)
      })
    }
  })

  // Build section hierarchy
  const rootSections = sections.filter(s => !s.parentIds || s.parentIds.length === 0)
  
  function buildSectionYaml(section: Entity, indent: number = 0): string {
    const spaces = ' '.repeat(indent)
    let yaml = `${spaces}${section.name}:\n`
    
    // Add entities in this section
    const sectionEntities = sectionToEntities.get(section.id) || []
    if (sectionEntities.length > 0) {
      yaml += `${spaces}  entities:\n`
      sectionEntities.forEach(entity => {
        yaml += buildEntityYaml(entity, indent + 4)
      })
    }
    
    // Add subsections
    const childSections = sections.filter(s => s.parentIds?.includes(section.id))
    if (childSections.length > 0) {
      yaml += `${spaces}  sections:\n`
      childSections.forEach(child => {
        yaml += buildSectionYaml(child, indent + 4)
      })
    }
    
    return yaml
  }

  function buildEntityYaml(entity: Entity, indent: number = 0): string {
    const spaces = ' '.repeat(indent)
    let yaml = `${spaces}${entity.name}:\n`
    yaml += `${spaces}  type: ${entity.type || 'unknown'}\n`
    
    if (entity.properties && entity.properties.length > 0) {
      yaml += `${spaces}  properties:\n`
      entity.properties.forEach(prop => {
        yaml += `${spaces}    ${prop.name}:\n`
        yaml += `${spaces}      type: ${prop.type}\n`
        if (prop.description) {
          yaml += `${spaces}      description: "${prop.description}"\n`
        }
        if (prop.flags) {
          yaml += `${spaces}      flags:\n`
          Object.entries(prop.flags).forEach(([flag, value]) => {
            yaml += `${spaces}        ${flag}: ${value}\n`
          })
        }
      })
    }
    
    return yaml
  }

  // Generate the final YAML
  let yaml = 'sections:\n'
  rootSections.forEach(section => {
    yaml += buildSectionYaml(section, 2)
  })

  // Add orphaned entities (not in any section)
  const orphanedEntities = nonSectionEntities.filter(e => !e.parentIds || e.parentIds.length === 0)
  if (orphanedEntities.length > 0) {
    yaml += '\nentities:\n'
    orphanedEntities.forEach(entity => {
      yaml += buildEntityYaml(entity, 2)
    })
  }

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
