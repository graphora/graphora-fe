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

interface Section {
  id: string;
  name: string;
  isSection: boolean;
  parentIds: string[];
  subsections?: Section[];
}

const DEFAULT_ONTOLOGY = {
  sections: [],
  entities: []
}

function processSection(sectionName: string, sectionData: any): Section {
  const section: Section = {
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
    // Return an empty structure or a default one if preferred
    return { version: '1.0.0', entities: {} }; 
  }

  const yamlData: any = {
    // Use version from input ontology, default if missing
    version: ontology.version || '1.0.0', 
    entities: {} // Initialize as object
  };

  // Sections conversion (Assuming sections part is less critical for now)
  // Keep the existing logic, but ensure it doesn't break if ontology.sections is missing
  if (ontology.sections && typeof ontology.sections === 'object') { // Check if sections exists and is object
    yamlData.sections = {}; // Initialize if converting sections
    for (const sectionName in ontology.sections) { // Iterate if it's an object
      const section = ontology.sections[sectionName];
      // ... (rest of your section processing logic) ...
      // Example placeholder:
      yamlData.sections[sectionName] = section; 
    }
     // Cleanup empty sections object
     if (Object.keys(yamlData.sections).length === 0) {
        delete yamlData.sections;
     }
  }

  // Convert entities (Expects ontology.entities to be an object from graph-editor-store)
  if (ontology.entities && typeof ontology.entities === 'object') {
    for (const entityName in ontology.entities) {
      const entity = ontology.entities[entityName];
      // Ensure entity is an object before processing
      if (entity && typeof entity === 'object') { 
         const entityData: any = {};
         // Directly copy properties and relationships if they exist
         // This relies on graph-editor-store correctly formatting them
         if (entity.properties && Object.keys(entity.properties).length > 0) {
           entityData.properties = entity.properties; // Should contain full definitions
         }
         if (entity.relationships && Object.keys(entity.relationships).length > 0) {
           entityData.relationships = entity.relationships; // Should contain full definitions
         }
         // Add the entity data to the YAML structure
         yamlData.entities[entityName] = entityData;
      } else {
         console.warn(`[convertOntologyToYaml] Entity '${entityName}' has unexpected format:`, entity);
      }
    }
  } else {
     console.warn('[convertOntologyToYaml] ontology.entities is missing or not an object:', ontology.entities);
  }

  return yamlData;
}

export const useOntologyEditorStore = create<OntologyEditorState>((set) => ({
  yaml: '',
  ontology: DEFAULT_ONTOLOGY,
  
  setYaml: (yaml: string) => set({ yaml }),
  setOntology: (ontology: any) => set({ ontology: ontology || DEFAULT_ONTOLOGY }),
  
  updateFromYaml: (yaml: string) => {
    if (!yaml.trim()) {
      // Reset to a default state consistent with object format if needed
      set({ yaml: '', ontology: { version: '1.0.0', entities: {} } }); 
      return;
    }
    try {
      const yamlData = parse(yaml); // yamlData has entities as object
      // convertYamlToOntology might not be needed here if yamlData is already the desired internal format?
      // For now, assume internal format is { version: ..., entities: {...} }
      set({ yaml, ontology: yamlData }); 
    } catch (error) {
      console.error('Error parsing YAML:', error);
      // Reset or keep previous state on error
      set(state => ({ yaml, ontology: state.ontology || { version: '1.0.0', entities: {} } })); 
    }
  },
  
  updateFromOntology: (ontology: any) => {
    // ontology comes from graphEditorStore.toOntology() -> { version: ..., entities: {...} }
    try {
      const yamlData = convertOntologyToYaml(ontology); // Converts {entities: obj} to {entities: obj}
      const yaml = stringify(yamlData, { indent: 2 }); // Use indentation
      // Store the ontology format received from graph store directly? Or convert? Be consistent.
      set({ yaml, ontology: ontology || DEFAULT_ONTOLOGY }); 
    } catch (error) {
      console.error('Error converting ontology to YAML:', error);
      // Keep the ontology that caused the error?
      set(state => ({ ontology: ontology || state.ontology || DEFAULT_ONTOLOGY }));
    }
  },
}))
