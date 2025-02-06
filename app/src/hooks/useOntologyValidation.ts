import { useState, useCallback } from 'react'
import { validateYAML } from '@/lib/yaml-validator'
import { Entity } from '@/lib/types/entity'
import { stringify } from 'yaml'

interface ValidationResult {
  errors: string[]
  warnings: string[]
  info: string[]
}

interface UseOntologyValidationProps {
  onValidYamlChange?: (yaml: string) => void
}

interface ValidateOntologyParams {
  entities: Entity[]
}

function generateYAML(entities: Entity[] = []): any {
  const entityMap = new Map(entities.map(e => [e.id, e]))
  const sections: { [key: string]: string[] } = {}
  const entitiesOutput: { [key: string]: any } = {}

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
    
    if (childEntities.length > 0) {
      sections[section.name] = childEntities.map(e => e.name)
    } else {
      sections[section.name] = []
    }

    // Process child sections recursively
    childSections.forEach(childSection => {
      buildSectionTree(childSection)
    })
  }

  // First pass: Build section hierarchy
  const rootSections = entities.filter(e => 
    e.isSection && (!e.parentIds || e.parentIds.length === 0)
  )
  rootSections.forEach(section => {
    buildSectionTree(section)
  })

  // Second pass: Build entities output
  entities.forEach(entity => {
    if (!entity || !entity.name) return

    const cleanEntity: any = {}

    // Add properties if they exist and are valid
    if (entity.properties && Object.keys(entity.properties).length > 0) {
      cleanEntity.properties = {}
      Object.entries(entity.properties).forEach(([propName, prop]) => {
        cleanEntity.properties[propName] = {
          type: prop.type || 'str',
          description: prop.description
        }
        
        // Only add flags if they are true
        if (prop.required) {
          cleanEntity.properties[propName].required = true
        }
        if (prop.index) {
          cleanEntity.properties[propName].index = true
        }
        if (prop.unique) {
          cleanEntity.properties[propName].unique = true
        }
      })
    }

    // Add relationships if they exist and are valid
    if (entity.relationships && Object.keys(entity.relationships).length > 0) {
      cleanEntity.relationships = {}
      Object.entries(entity.relationships).forEach(([relName, rel]) => {
        if (!rel.target) return
        cleanEntity.relationships[relName] = {
          target: rel.target
        }
      })
    }

    // Only add non-empty entities
    if (Object.keys(cleanEntity).length > 0) {
      entitiesOutput[entity.name] = cleanEntity
    }
  })

  return {
    sections,
    entities: entitiesOutput
  }
}

export function useOntologyValidation({ onValidYamlChange }: UseOntologyValidationProps = {}) {
  const [validation, setValidation] = useState<ValidationResult>({
    errors: [],
    warnings: [],
    info: []
  })

  const validateOntology = useCallback(({ entities }: ValidateOntologyParams) => {
    try {
      // Convert the ontology data to YAML
      const yamlStructure = generateYAML(entities)
      const yaml = stringify(yamlStructure)

      // Validate the YAML
      const validationResult = validateYAML(yaml)
      setValidation(validationResult)

      // If there are no errors and onValidYamlChange is provided, call it
      if (validationResult.errors.length === 0 && onValidYamlChange) {
        onValidYamlChange(yaml)
      }
    } catch (error) {
      console.error('Error validating ontology:', error)
      setValidation({
        errors: ['Failed to validate ontology. Please check your entity structure.'],
        warnings: [],
        info: []
      })
    }
  }, [onValidYamlChange])

  return {
    validation,
    validateOntology
  }
}
