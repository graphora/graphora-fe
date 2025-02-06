import { create } from 'zustand'
import { parse, stringify } from 'yaml'
import { v4 as uuidv4 } from 'uuid'

interface OntologyEditorState {
  yaml: string
  setYaml: (yaml: string) => void
  ontology: any
  setOntology: (ontology: any) => void
  updateFromYaml: (yaml: string) => void
  updateFromOntology: (ontology: any) => void
}

const DEFAULT_ONTOLOGY = {
  sections: [],
  entities: []
}

function processSection(sectionName: string, sectionData: any) {
  const section = {
    id: uuidv4(),
    name: sectionName,
    isSection: true,
    parentIds: [],
  }

  if (Array.isArray(sectionData)) {
    // If section data is an array, these are subsections
    section.subsections = sectionData
  } else if (typeof sectionData === 'object' && sectionData !== null) {
    // If section data is an object, merge its properties
    Object.assign(section, sectionData)
  }

  return section
}

function convertYamlToOntology(yamlData: any) {
  if (!yamlData || typeof yamlData !== 'object') {
    return DEFAULT_ONTOLOGY
  }

  const sections: any[] = []
  const entities: any[] = []

  // Convert sections
  if (yamlData.sections && typeof yamlData.sections === 'object') {
    for (const [sectionName, sectionData] of Object.entries(yamlData.sections)) {
      if (sectionName && sectionName.trim()) {
        const section = processSection(sectionName, sectionData)
        sections.push(section)
      }
    }
  }

  // Convert entities
  if (yamlData.entities && typeof yamlData.entities === 'object') {
    for (const [entityName, entityData] of Object.entries<any>(yamlData.entities)) {
      if (entityName && entityName.trim() && typeof entityData === 'object' && entityData !== null) {
        const entity = {
          id: uuidv4(),
          name: entityName,
          isSection: false,
          parentIds: [],
          properties: entityData.properties || {},
          relationships: entityData.relationships || {},
        }
        entities.push(entity)
      }
    }
  }

  return { sections, entities }
}

function convertOntologyToYaml(ontology: any) {
  if (!ontology || typeof ontology !== 'object') {
    return DEFAULT_ONTOLOGY
  }

  const yamlData: any = {
    sections: {},
    entities: {}
  }

  // Convert sections
  if (Array.isArray(ontology.sections)) {
    for (const section of ontology.sections) {
      if (section && section.name) {
        const sectionData: any = {}
        
        if (section.properties && Object.keys(section.properties).length > 0) {
          sectionData.properties = section.properties
        }
        if (section.relationships && Object.keys(section.relationships).length > 0) {
          sectionData.relationships = section.relationships
        }
        if (section.subsections && section.subsections.length > 0) {
          sectionData.subsections = section.subsections
        }
        
        yamlData.sections[section.name] = Object.keys(sectionData).length > 0 ? sectionData : null
      }
    }
  }

  // Convert entities
  if (Array.isArray(ontology.entities)) {
    for (const entity of ontology.entities) {
      if (entity && entity.name) {
        const entityData: any = {}
        
        if (entity.properties && Object.keys(entity.properties).length > 0) {
          entityData.properties = entity.properties
        }
        if (entity.relationships && Object.keys(entity.relationships).length > 0) {
          entityData.relationships = entity.relationships
        }
        
        yamlData.entities[entity.name] = Object.keys(entityData).length > 0 ? entityData : {}
      }
    }
  }

  return yamlData
}

export const useOntologyEditorStore = create<OntologyEditorState>((set) => ({
  yaml: '',
  ontology: DEFAULT_ONTOLOGY,
  
  setYaml: (yaml: string) => set({ yaml }),
  setOntology: (ontology: any) => set({ ontology: ontology || DEFAULT_ONTOLOGY }),
  
  updateFromYaml: (yaml: string) => {
    if (!yaml.trim()) {
      set({ yaml: '', ontology: DEFAULT_ONTOLOGY })
      return
    }

    try {
      const yamlData = parse(yaml)
      const ontology = convertYamlToOntology(yamlData)
      set({ yaml, ontology })
    } catch (error) {
      console.error('Error parsing YAML:', error)
      set({ yaml, ontology: DEFAULT_ONTOLOGY })
    }
  },
  
  updateFromOntology: (ontology: any) => {
    try {
      const yamlData = convertOntologyToYaml(ontology || DEFAULT_ONTOLOGY)
      const yaml = stringify(yamlData)
      set({ yaml, ontology: ontology || DEFAULT_ONTOLOGY })
    } catch (error) {
      console.error('Error converting ontology to YAML:', error)
      set({ ontology: ontology || DEFAULT_ONTOLOGY })
    }
  },
}))
