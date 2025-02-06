import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { Entity } from '../types/entity'
import { Relationship } from '../types/relationship'
import { dump as yamlDump } from 'js-yaml'

interface OntologyState {
  entities: Entity[]
  relationships: Relationship[]
  addEntity: (entity: Partial<Entity>) => void
  updateEntity: (id: string, updates: Partial<Entity>) => void
  deleteEntity: (id: string) => void
  moveEntity: (entityId: string, newParentId: string | null) => void
  addRelationship: (relationship: Omit<Relationship, 'id'>) => void
  deleteRelationship: (id: string) => void
  getYamlContent: () => string
}

export const useOntologyStore = create<OntologyState>((set, get) => ({
  entities: [],
  relationships: [],

  addEntity: (entity) => {
    const newEntity: Entity = {
      id: uuidv4(),
      name: '',
      isSection: false,
      parentIds: [],
      properties: [],
      relationships: [],
      ...entity,
    }
    set((state) => ({
      entities: [...state.entities, newEntity],
    }))
  },

  updateEntity: (id, updates) => {
    set((state) => ({
      entities: state.entities.map((entity) =>
        entity.id === id ? { ...entity, ...updates } : entity
      ),
    }))
  },

  deleteEntity: (id) => {
    set((state) => ({
      entities: state.entities.filter((entity) => entity.id !== id),
      relationships: state.relationships.filter(
        (rel) => rel.sourceId !== id && rel.targetId !== id
      ),
    }))
  },

  moveEntity: (entityId, newParentId) => {
    set((state) => ({
      entities: state.entities.map((entity) =>
        entity.id === entityId
          ? {
              ...entity,
              parentIds: newParentId ? [newParentId] : [],
            }
          : entity
      ),
    }))
  },

  addRelationship: (relationship) => {
    const newRelationship: Relationship = {
      id: uuidv4(),
      ...relationship,
    }
    set((state) => ({
      relationships: [...state.relationships, newRelationship],
    }))
  },

  deleteRelationship: (id) => {
    set((state) => ({
      relationships: state.relationships.filter((rel) => rel.id !== id),
    }))
  },

  getYamlContent: () => {
    const { entities, relationships } = get()
    
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

    // Build section tree recursively
    function buildSectionTree(section: Entity): any {
      const childEntities = getChildEntities(section.id)
      const childSections = getChildSections(section.id)
      
      let sectionContent = ''
      
      // Add child entities if any
      if (childEntities.length > 0) {
        childEntities.forEach(entity => {
          sectionContent += `    - ${entity.name}\n`
        })
      } else {
        sectionContent += '\n'
      }

      // Add child sections recursively
      childSections.forEach(childSection => {
        sectionContent += `    ${childSection.name}:\n`
        sectionContent += buildSectionTree(childSection)
      })

      return sectionContent
    }

    // Convert entity to YAML-friendly format
    function convertEntityToYaml(entity: Entity): any {
      const result: any = {}
      
      // Add properties if they exist
      if (entity.properties && Object.keys(entity.properties).length > 0) {
        result.properties = {}
        Object.entries(entity.properties).forEach(([propName, prop]) => {
          result.properties[propName] = {
            type: prop.type || 'str',
            ...(prop.description && { description: prop.description }),
            ...(prop.required && { required: true }),
            ...(prop.index && { index: true }),
            ...(prop.unique && { unique: true })
          }
        })
      }
      
      // Add relationships
      const entityRelationships = relationships.filter(rel => rel.sourceId === entity.id)
      if (entityRelationships.length > 0) {
        result.relationships = {}
        entityRelationships.forEach(rel => {
          const targetEntity = entities.find(e => e.id === rel.targetId)
          if (targetEntity) {
            result.relationships[rel.type] = {
              target: targetEntity.name
            }
          }
        })
      }
      
      return result
    }
    
    // Build final YAML structure
    const yamlStructure: any = {
      sections: {},
      entities: {}
    }
    
    // Add root sections
    const rootSections = entities.filter(e => 
      e.isSection && (!e.parentIds || e.parentIds.length === 0)
    )
    
    // Build sections part
    let sectionsYaml = 'sections:\n'
    rootSections.forEach(section => {
      sectionsYaml += `  ${section.name}:`
      sectionsYaml += buildSectionTree(section)
    })
    
    // Build entities part
    let entitiesYaml = '\nentities:\n'
    entities.forEach(entity => {
      const entityYaml = convertEntityToYaml(entity)
      if (Object.keys(entityYaml).length > 0) {
        entitiesYaml += `  ${entity.name}:\n`
        const yamlString = yamlDump(entityYaml, { indent: 4 })
          .split('\n')
          .map(line => `    ${line}`)
          .join('\n')
        entitiesYaml += `${yamlString}\n`
      }
    })
    
    return sectionsYaml + entitiesYaml
  },
}))
