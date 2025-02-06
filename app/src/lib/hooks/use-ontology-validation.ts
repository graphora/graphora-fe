import { useCallback } from 'react'
import { useOntologyStore } from '../store/ontology-store'
import { Entity } from '../types/entity'

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function useOntologyValidation() {
  const { entities, relationships } = useOntologyStore()

  const validateOntology = useCallback((): ValidationResult => {
    const errors: string[] = []

    // Helper to get entity by ID
    const getEntityById = (id: string) => entities.find(e => e.id === id)

    // Check if all entities have names
    entities.forEach(entity => {
      if (!entity.name?.trim()) {
        errors.push(`Entity ${entity.id} has no name`)
      }
    })

    // Check if section references are valid
    entities.forEach(entity => {
      if (entity.parentIds) {
        entity.parentIds.forEach(parentId => {
          const parent = getEntityById(parentId)
          if (!parent) {
            errors.push(`Entity ${entity.name} references non-existent parent ${parentId}`)
          } else if (!parent.isSection) {
            errors.push(`Entity ${entity.name} references non-section entity ${parent.name} as parent`)
          }
        })
      }
    })

    // Check if relationship references are valid
    relationships.forEach(rel => {
      const source = getEntityById(rel.sourceId)
      const target = getEntityById(rel.targetId)

      if (!source) {
        errors.push(`Relationship references non-existent source entity ${rel.sourceId}`)
      }
      if (!target) {
        errors.push(`Relationship references non-existent target entity ${rel.targetId}`)
      }
      if (!rel.type?.trim()) {
        errors.push(`Relationship between ${source?.name || 'unknown'} and ${target?.name || 'unknown'} has no type`)
      }
    })

    // Check for circular section dependencies
    const checkCircularDependency = (entityId: string, visited = new Set<string>()): boolean => {
      if (visited.has(entityId)) return true
      
      const entity = getEntityById(entityId)
      if (!entity || !entity.parentIds) return false
      
      visited.add(entityId)
      return entity.parentIds.some(parentId => checkCircularDependency(parentId, new Set(visited)))
    }

    entities
      .filter(e => e.isSection)
      .forEach(section => {
        if (checkCircularDependency(section.id)) {
          errors.push(`Section ${section.name} has circular dependency`)
        }
      })

    return {
      isValid: errors.length === 0,
      errors
    }
  }, [entities, relationships])

  return validateOntology
}
