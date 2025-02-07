import { YAMLStructure, PropertyDefinition } from './types/yaml'
import * as yaml from 'js-yaml'

interface ValidationResult {
  errors: string[]
  warnings: string[]
  info: string[]
}

export function validateYAML(yamlString: string): ValidationResult {
  const result: ValidationResult = {
    errors: [],
    warnings: [],
    info: []
  }

  try {
    // Parse YAML
    const parsedYaml = yaml.load(yamlString) as YAMLStructure

    // Validate basic structure
    if (!parsedYaml || typeof parsedYaml !== 'object') {
      result.errors.push('Invalid YAML structure')
      return result
    }

    // Check required sections
    if (!parsedYaml.sections) {
      result.errors.push('Missing required "sections" field')
    }

    if (!parsedYaml.entities) {
      result.errors.push('Missing required "entities" field')
    }

    // Validate Metadata section
    if (!parsedYaml.sections?.Metadata) {
      result.errors.push('Missing required Metadata section')
    }

    // Validate sections and entities
    if (parsedYaml.sections && parsedYaml.entities) {
      // Check section references
      Object.entries(parsedYaml.sections).forEach(([sectionName, entityNames]) => {
        if (!Array.isArray(entityNames)) {
          result.errors.push(`Section "${sectionName}" must contain an array of entity names`)
          return
        }

        entityNames.forEach(entityName => {
          if (!parsedYaml.entities[entityName]) {
            result.errors.push(`Entity "${entityName}" referenced in section "${sectionName}" is not defined`)
          }
        })
      })

      // Validate entities
      Object.entries(parsedYaml.entities).forEach(([entityName, entity]) => {
        // Check properties
        if (!entity.properties || typeof entity.properties !== 'object') {
          result.errors.push(`Entity "${entityName}" must have properties defined`)
          return
        }

        // Validate properties
        Object.entries(entity.properties).forEach(([propName, prop]) => {
          validateProperty(propName, prop, entityName, result)
        })

        // Validate relationships if present
        if (entity.relationships) {
          Object.entries(entity.relationships).forEach(([relName, rel]) => {
            if (!parsedYaml.entities[rel.type]) {
              result.errors.push(`Invalid relationship target "${rel}" in entity "${entityName}"`)
            }
          })
        }
      })
    }

    // Check for memory limits
    const yamlSize = new Blob([yamlString]).size
    if (yamlSize > 10 * 1024 * 1024) { // 10MB
      result.warnings.push('YAML file size exceeds recommended limit of 10MB')
    }

    // Check for unique names
    const entityNames = new Set<string>()
    Object.keys(parsedYaml.entities || {}).forEach(name => {
      if (entityNames.has(name)) {
        result.errors.push(`Duplicate entity name "${name}"`)
      }
      entityNames.add(name)
    })

  } catch (error: any) {
    result.errors.push(`YAML parsing error: ${error.message}`)
  }

  return result
}

function validateProperty(
  name: string,
  prop: PropertyDefinition,
  entityName: string,
  result: ValidationResult
) {
  // Validate property type
  if (!prop.type || !['str', 'int', 'float', 'bool', 'date'].includes(prop.type)) {
    result.errors.push(`Invalid property type "${prop.type}" for property "${name}" in entity "${entityName}"`)
  }

  // Check required fields
  if (prop.required && !prop.description) {
    result.warnings.push(`Missing description for required property "${name}" in entity "${entityName}"`)
  }

  // Check index configuration
  if (prop.index && !prop.unique) {
    result.info.push(`Consider adding unique constraint to indexed property "${name}" in entity "${entityName}"`)
  }
}
