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

function generateYAML(entities: Entity[]): any {
  const entityMap = new Map(entities.map(e => [e.id, e]))
  const sections: { [key: string]: string[] } = {}
  const entitiesOutput: { [key: string]: any } = {}

  // First pass: Organize sections and their children
  entities.forEach(entity => {
    if (entity.isSection) {
      sections[entity.name] = entity.childSections?.map(id => {
        const childEntity = entityMap.get(id)
        return childEntity?.name || ''
      }).filter(name => name !== '') || []
    }
  })

  // Second pass: Build entities output
  entities.forEach(entity => {
    const { id, position, childSections, ...rest } = entity
    const cleanEntity: any = {}

    // Add properties if they exist
    if (Object.keys(rest.properties).length > 0) {
      cleanEntity.properties = rest.properties
    }

    // Add relationships if they exist
    if (Object.keys(rest.relationships).length > 0) {
      cleanEntity.relationships = rest.relationships
    }

    entitiesOutput[entity.name] = cleanEntity
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
  }, [onValidYamlChange])

  return {
    validation,
    validateOntology
  }
}
