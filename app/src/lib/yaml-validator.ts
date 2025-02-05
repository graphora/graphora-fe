import { parse } from 'yaml'

export interface YamlValidationResult {
  isValid: boolean
  errors: string[]
}

export function validateOntologyYaml(yamlString: string): YamlValidationResult {
  const errors: string[] = []
  
  try {
    const parsed = parse(yamlString)
    
    // Check for required top-level sections
    const requiredSections = ['sections', 'entities']
    requiredSections.forEach(section => {
      if (!parsed || !parsed[section]) {
        errors.push(`Missing required section: '${section}'`)
      }
    })

    // Validate entities structure if present
    if (parsed?.entities) {
      Object.entries(parsed.entities).forEach(([entityName, entity]: [string, any]) => {
        // Check if entity has either properties or relationships
        if (!entity.properties && !entity.relationships) {
          errors.push(`Entity '${entityName}' must have either 'properties' or 'relationships'`)
        }

        // Validate properties if present
        if (entity.properties) {
          Object.entries(entity.properties).forEach(([propName, prop]: [string, any]) => {
            if (!prop.type) {
              errors.push(`Property '${propName}' in entity '${entityName}' must have a type`)
            }
          })
        }

        // Validate relationships if present
        if (entity.relationships) {
          Object.entries(entity.relationships).forEach(([relName, rel]: [string, any]) => {
            if (!rel.target) {
              errors.push(`Relationship '${relName}' in entity '${entityName}' must have a target`)
            }
          })
        }
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  } catch (error) {
    return {
      isValid: false,
      errors: [(error as Error).message]
    }
  }
}
