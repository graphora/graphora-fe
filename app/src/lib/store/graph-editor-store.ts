import { create } from 'zustand'
import { Vector } from '@/lib/utils/vector'
import { Point } from '@/lib/utils/point'
import { v4 as uuidv4 } from 'uuid'
import { produce } from 'immer' // Use Immer for safer state updates

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[GraphEditorStore]', ...args)
  }
}
const debugWarn = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.warn('[GraphEditorStore]', ...args)
  }
}

// Types
// Re-introducing PropertyDefinition
export interface PropertyDefinition {
  type: string;
  description?: string;
  unique?: boolean;
  required?: boolean;
  index?: boolean;
  [key: string]: any; // Allow other fields like in original YAML
}

export interface Node {
  id: string
  position: Point
  caption: string // Entity name
  labels: string[]
  properties: Record<string, PropertyDefinition> // Use PropertyDefinition
  style: Record<string, any>
}

export interface Relationship {
  id: string
  from: string // from Node ID
  to: string // to Node ID
  type: string // Relationship type/name
  properties: Record<string, PropertyDefinition> // Use PropertyDefinition
  style: Record<string, any>
}

export interface Graph {
  nodes: Record<string, Node>
  relationships: Record<string, Relationship>
  style: Record<string, any>
}

export interface Selection {
  nodes: string[]
  relationships: string[]
  isActive: boolean
}

export interface ViewTransformation {
  scale: number
  translate: Vector
}

export interface CanvasSize {
  width: number
  height: number
}

export interface GraphEditorState {
  graph: Graph
  selection: Selection
  viewTransformation: ViewTransformation
  canvasSize: CanvasSize
  ontologyVersion: string | null // Add version back
  
  // Actions
  addNode: (position: Point, caption?: string, labels?: string[], properties?: Record<string, PropertyDefinition>) => string
  updateNode: (id: string, updates: Partial<Node>) => void
  deleteNode: (id: string) => void
  
  addRelationship: (fromId: string, toId: string, type?: string, properties?: Record<string, PropertyDefinition>) => string
  updateRelationship: (id: string, updates: Partial<Relationship>) => void
  deleteRelationship: (id: string) => void
  
  selectNode: (id: string, multiSelect?: boolean) => void
  selectRelationship: (id: string, multiSelect?: boolean) => void
  clearSelection: () => void
  
  setViewTransformation: (viewTransformation: Partial<ViewTransformation>) => void
  setCanvasSize: (size: CanvasSize) => void
  
  deleteSelection: () => void
  duplicateSelection: () => void
  
  // Conversion to/from ontology
  fromOntology: (ontology: any) => void
  toOntology: () => any
  reset: () => void
}

const DEFAULT_STYLE = {
  'background-color': '#f5f5f5',
  'node-color': '#4299e1',
  'relationship-color': '#2d3748',
  'node-radius': 40,
  'border-width': 2,
  'font-size': 14,
  'font-family': 'Arial, sans-serif',
  'caption-position': 'inside'
}

const DEFAULT_NODE_STYLE = {
  'node-color': '#4299e1',
  'border-color': '#2b6cb0',
  'text-color': '#ffffff',
  'border-width': 2,
  'caption-position': 'inside'
}

const DEFAULT_RELATIONSHIP_STYLE = {
  'relationship-color': '#2d3748',
  'text-color': '#000000',
  'shaft-width': 2,
  'arrow-width': 6,
  'arrow-size': 10
}

const createBaseState = (): Pick<GraphEditorState, 'graph' | 'selection' | 'viewTransformation' | 'canvasSize' | 'ontologyVersion'> => ({
  graph: {
    nodes: {},
    relationships: {},
    style: { ...DEFAULT_STYLE }
  },
  selection: {
    nodes: [],
    relationships: [],
    isActive: false
  },
  viewTransformation: {
    scale: 1,
    translate: new Vector(0, 0)
  },
  canvasSize: {
    width: 800,
    height: 600
  },
  ontologyVersion: null
})

// Generate colors dynamically based on entity name
const getEntityColor = (entityName: string): string => {
  // Use a hash function to generate a consistent color for each entity name
  const hash = Array.from(entityName).reduce(
    (hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0
  );
  
  // Generate HSL color with consistent saturation and lightness
  // but varying hue based on the hash
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 65%)`;
}

// Helper function to adjust color brightness for HSL colors
const adjustColor = (color: string, amount: number): string => {
  // Check if it's an HSL color
  if (color.startsWith('hsl')) {
    const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (hslMatch) {
      const h = parseInt(hslMatch[1], 10);
      const s = parseInt(hslMatch[2], 10);
      const l = Math.max(0, Math.min(100, parseInt(hslMatch[3], 10) + amount));
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
  }
  
  // For hex colors or if HSL parsing fails
  if (color.startsWith('#')) {
    // Remove the # from the beginning
    let hex = color.replace('#', '');
    
    // Parse the hex values
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    
    // Adjust the values
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  // Return original color if format not recognized
  return color;
}

export const useGraphEditorStore = create<GraphEditorState>((set, get) => ({
  ...createBaseState(),
  
  // Node actions
  addNode: (position, caption = '', labels = [], properties = {}) => {
    const id = uuidv4()
    const nodeColor = getEntityColor(caption)
    
    set(produce((state: GraphEditorState) => {
      state.graph.nodes[id] = {
            id,
            position,
            caption,
            labels,
        properties,
            style: { 
              ...DEFAULT_NODE_STYLE,
              'node-color': nodeColor,
          'border-color': adjustColor(nodeColor, -20)
        }
      }
    }))
    return id
  },
  
  updateNode: (id, updates) => {
    set(produce((state: GraphEditorState) => {
      const node = state.graph.nodes[id]
      if (!node) return
      
      // Update style if caption changes
      let updatedStyle = { ...node.style }
      if (updates.caption && updates.caption !== node.caption) {
        const nodeColor = getEntityColor(updates.caption)
        updatedStyle = {
          ...updatedStyle,
          'node-color': nodeColor,
          'border-color': adjustColor(nodeColor, -20)
        }
      }
      
      // Merge updates - Use Object.assign carefully
      const currentProperties = node.properties
      const currentStyle = node.style
      // Assign basic updates first
      Object.assign(node, updates)
      // Specifically handle deep merge for properties if provided
      if (updates.properties) {
        node.properties = { ...currentProperties, ...updates.properties }
      }
      // Apply style updates
      node.style = updates.style ? { ...currentStyle, ...updatedStyle, ...updates.style } : updatedStyle
    }))
  },
  
  deleteNode: (id) => {
    set(state => {
      const { [id]: _, ...remainingNodes } = state.graph.nodes
      
      // Also delete any relationships connected to this node
      const remainingRelationships = Object.entries(state.graph.relationships)
        .filter(([_, rel]) => rel.from !== id && rel.to !== id)
        .reduce((acc, [relId, rel]) => ({ ...acc, [relId]: rel }), {})
      
      return {
        graph: {
          ...state.graph,
          nodes: remainingNodes,
          relationships: remainingRelationships
        },
        selection: {
          ...state.selection,
          nodes: state.selection.nodes.filter(nodeId => nodeId !== id)
        }
      }
    })
  },
  
  // Relationship actions
  addRelationship: (fromId, toId, type = 'RELATES_TO', properties = {}) => {
    const id = uuidv4()
    set(produce((state: GraphEditorState) => {
      state.graph.relationships[id] = {
            id,
            from: fromId,
            to: toId,
            type,
        properties,
            style: { ...DEFAULT_RELATIONSHIP_STYLE }
      }
    }))
    return id
  },
  
  updateRelationship: (id, updates) => {
    set(produce((state: GraphEditorState) => {
      const relationship = state.graph.relationships[id]
      if (!relationship) return
      
      debug('Updating relationship with id:', id)
      debug('Updates received:', JSON.stringify(updates))
      
      // Specifically handle properties to ensure deep merging
      if (updates.properties) {
        debug('Merging relationship properties:', JSON.stringify(updates.properties))
        relationship.properties = { ...relationship.properties, ...updates.properties };
      }
      
      // Handle other fields
      if (updates.type) relationship.type = updates.type;
      if (updates.from) relationship.from = updates.from;
      if (updates.to) relationship.to = updates.to;
      if (updates.style) relationship.style = { ...relationship.style, ...updates.style };
      
      debug('Updated relationship:', JSON.stringify(relationship))
    }))
  },
  
  deleteRelationship: (id) => {
    set(state => {
      const { [id]: _, ...remainingRelationships } = state.graph.relationships
      
      return {
        graph: {
          ...state.graph,
          relationships: remainingRelationships
        },
        selection: {
          ...state.selection,
          relationships: state.selection.relationships.filter(relId => relId !== id)
        }
      }
    })
  },
  
  // Selection actions
  selectNode: (id, multiSelect = false) => {
    set(state => ({
      selection: {
        nodes: multiSelect ? 
          (state.selection.nodes.includes(id) ? 
            state.selection.nodes.filter(nodeId => nodeId !== id) : 
            [...state.selection.nodes, id]) : 
          [id],
        relationships: multiSelect ? state.selection.relationships : [],
        isActive: true
      }
    }))
  },
  
  selectRelationship: (id, multiSelect = false) => {
    set(state => ({
      selection: {
        nodes: multiSelect ? state.selection.nodes : [],
        relationships: multiSelect ? 
          (state.selection.relationships.includes(id) ? 
            state.selection.relationships.filter(relId => relId !== id) : 
            [...state.selection.relationships, id]) : 
          [id],
        isActive: true
      }
    }))
  },
  
  clearSelection: () => {
    set({
      selection: {
        nodes: [],
        relationships: [],
        isActive: false
      }
    })
  },
  
  // View actions
  setViewTransformation: (viewTransformation) => {
    set(state => ({
      viewTransformation: {
        ...state.viewTransformation,
        ...viewTransformation
      }
    }))
  },
  
  setCanvasSize: (size) => {
    set({ canvasSize: size })
  },
  
  // Bulk actions
  deleteSelection: () => {
    const { selection, deleteNode, deleteRelationship } = get()
    
    // Delete relationships first to avoid issues with connected nodes
    selection.relationships.forEach(id => deleteRelationship(id))
    selection.nodes.forEach(id => deleteNode(id))
  },
  
  duplicateSelection: () => {
    set(produce((state: GraphEditorState) => {
      const { graph, selection } = state
    const nodeIdMap: Record<string, string> = {}
      const newSelectionNodes: string[] = []
      const newSelectionRelationships: string[] = []
    
    // Duplicate nodes
    selection.nodes.forEach(id => {
      const node = graph.nodes[id]
      if (node) {
        const newPosition = new Point(node.position.x + 20, node.position.y + 20)
          const newNodeId = uuidv4()
          nodeIdMap[id] = newNodeId
          
          state.graph.nodes[newNodeId] = {
            ...node, // Copy all fields
            id: newNodeId,
            position: newPosition,
            // Deep copy properties and style to avoid reference issues
            properties: JSON.parse(JSON.stringify(node.properties)),
            style: JSON.parse(JSON.stringify(node.style))
          }
          newSelectionNodes.push(newNodeId)
      }
    })
    
    // Duplicate relationships (only if both nodes are in the selection)
    selection.relationships.forEach(id => {
      const relationship = graph.relationships[id]
      if (relationship && nodeIdMap[relationship.from] && nodeIdMap[relationship.to]) {
          const newRelationshipId = uuidv4()
          state.graph.relationships[newRelationshipId] = {
            ...relationship,
            id: newRelationshipId,
            from: nodeIdMap[relationship.from],
            to: nodeIdMap[relationship.to],
            // Deep copy properties and style
            properties: JSON.parse(JSON.stringify(relationship.properties)),
            style: JSON.parse(JSON.stringify(relationship.style))
          }
          newSelectionRelationships.push(newRelationshipId)
        }
      })
      
      // Update selection state
      state.selection = {
        nodes: newSelectionNodes,
        relationships: newSelectionRelationships, // Select duplicated relationships too
        isActive: true
      }
    }))
  },
  
  // Conversion to/from ontology
  fromOntology: (ontology) => {
    set(produce((state: GraphEditorState) => {
      state.graph = { nodes: {}, relationships: {}, style: DEFAULT_STYLE }
      state.selection = { nodes: [], relationships: [], isActive: false }
      state.ontologyVersion = ontology?.version || null
      
      if (!ontology || typeof ontology.entities !== 'object' || ontology.entities === null) {
        debugWarn('[fromOntology] Invalid ontology format (entities missing or not an object):', ontology)
      return
    }
    
      const entities = ontology.entities
      const nodeIds: Record<string, string> = {}
      let i = 0
      
      // --- Circular Layout Setup ---
      const numNodes = Object.keys(entities).length
      const radius = Math.max(100, numNodes * 25) // Adjust radius based on node count
      const centerX = 400 // Or base on canvasSize if available reliably
      const centerY = 300
      // --- End Circular Layout Setup ---
      
      // First pass: create nodes
      for (const entityName in entities) {
        const entity = entities[entityName]
        if (!entity || typeof entity !== 'object') continue
        
        const nodeId = uuidv4()
        nodeIds[entityName] = nodeId
        
        // Calculate position using circular layout
        const angle = (i / numNodes) * 2 * Math.PI // Angle for this node
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      const position = new Point(x, y)
      
        const nodeColor = getEntityColor(entityName)
        const nodeProperties: Record<string, PropertyDefinition> = {}
        
        // Store full property definitions
        if (entity.properties && typeof entity.properties === 'object') {
          for (const propName in entity.properties) {
            const propData = entity.properties[propName]
            if (typeof propData === 'object' && propData !== null && propData.type) {
              nodeProperties[propName] = { ...propData } // Copy full definition
          } else {
              debugWarn(`[fromOntology] Property '${propName}' for entity '${entityName}' has unexpected format:`, propData)
              nodeProperties[propName] = { type: String(propData?.type || 'string'), description: propName }
            }
          }
        }
        
        state.graph.nodes[nodeId] = {
          id: nodeId,
          position,
          caption: entityName,
          labels: [entityName],
          properties: nodeProperties,
          style: { ...DEFAULT_NODE_STYLE, 'node-color': nodeColor, 'border-color': adjustColor(nodeColor, -20) }
        }
        i++
      }
      
      // Second pass: create relationships
      for (const entityName in entities) {
        const entity = entities[entityName]
        if (!entity || typeof entity !== 'object' || !entity.relationships) continue
        const fromNodeId = nodeIds[entityName]
        if (!fromNodeId) continue
        
        for (const relType in entity.relationships) {
          const relInfo = entity.relationships[relType]
          if (!relInfo || typeof relInfo !== 'object' || !relInfo.target) continue
          
          const targetEntityName = relInfo.target
          const toNodeId = nodeIds[targetEntityName]
          
          if (toNodeId) {
            const relId = uuidv4()
            const relProperties: Record<string, PropertyDefinition> = {}
            
            if (relInfo.properties && typeof relInfo.properties === 'object') {
              for (const propName in relInfo.properties) {
                const propData = relInfo.properties[propName]
                if (typeof propData === 'object' && propData !== null && propData.type) {
                  relProperties[propName] = { ...propData }
                  } else {
                  debugWarn(`[fromOntology] Property '${propName}' for relationship '${relType}' has unexpected format:`, propData)
                  relProperties[propName] = { type: String(propData?.type || 'string'), description: propName }
                }
              }
            }
            
            state.graph.relationships[relId] = {
              id: relId,
              from: fromNodeId,
              to: toNodeId,
              type: relType,
              properties: relProperties,
              style: { ...DEFAULT_RELATIONSHIP_STYLE }
            }
          } else {
            debugWarn(`[fromOntology] Could not create relationship '${relType}' from '${entityName}' to '${targetEntityName}': Target node ID missing.`)
          }
        }
      }
      debug('[fromOntology] Conversion complete. Resulting graph state:', state.graph)
    }))
  },
  
  toOntology: () => {
    const state = get()
    const ontology: any = {
      version: state.ontologyVersion || '0.1.0',
      entities: {}
    }
    const nodeMap = new Map<string, Node>(Object.entries(state.graph.nodes))
    
    // Build entities structure from nodes
    nodeMap.forEach((node) => {
      if (!node.caption) return
      ontology.entities[node.caption] = {}
      
      // Add properties (only if present)
      if (Object.keys(node.properties).length > 0) {
        ontology.entities[node.caption].properties = {}
        for (const propName in node.properties) {
          const sourceDef = node.properties[propName]
          // Copy all defined keys from the stored PropertyDefinition
          const propDefinition: any = {}
          if (sourceDef && typeof sourceDef === 'object') {
             for (const key in sourceDef) {
                if (sourceDef[key] !== undefined) {
                   propDefinition[key] = sourceDef[key]
                }
             }
             // Ensure type exists
             if (!propDefinition.type) propDefinition.type = 'string'
             ontology.entities[node.caption].properties[propName] = propDefinition
          } else {
             // Fallback for malformed data
             ontology.entities[node.caption].properties[propName] = { type: 'string', description: propName }
          }
        }
      }
    })
    
    // Add relationships structure to entities
    Object.values(state.graph.relationships).forEach((rel) => {
      const fromNode = nodeMap.get(rel.from)
      const toNode = nodeMap.get(rel.to)
      
      debug(`[toOntology] Processing relationship: ${rel.type} from ${fromNode?.caption} to ${toNode?.caption}`)
      debug(`[toOntology] Relationship properties:`, JSON.stringify(rel.properties, null, 2))
      
      if (fromNode?.caption && toNode?.caption && ontology.entities[fromNode.caption]) {
        const fromEntity = ontology.entities[fromNode.caption]
        
        // Initialize relationships object if needed
        if (!fromEntity.relationships) {
          fromEntity.relationships = {}
        }
        
        // Initialize relationship type entry
        fromEntity.relationships[rel.type] = { 
          target: toNode.caption 
        }
        
        // Add relationship properties (only if present)
        if (rel.properties && Object.keys(rel.properties).length > 0) {
        debug(`[toOntology] Relationship ${rel.type} has ${Object.keys(rel.properties).length} properties`)
          
          // Initialize properties object for this relationship
          fromEntity.relationships[rel.type].properties = {}
          
          // Process each property
          for (const propName in rel.properties) {
             debug(`[toOntology] Processing property '${propName}' for relationship '${rel.type}'`)
             const sourceDef = rel.properties[propName]
             
             // Detailed logging to track property values
             debug(`[toOntology] Property value:`, JSON.stringify(sourceDef, null, 2))
             
             // Create property definition
             const propDefinition: any = {}
             if (sourceDef && typeof sourceDef === 'object') {
                // Copy all defined fields
                for (const key in sourceDef) {
                   if (sourceDef[key] !== undefined) {
                      propDefinition[key] = sourceDef[key]
                   }
                }
                
                // Ensure type exists
                if (!propDefinition.type) propDefinition.type = 'string'
                
                // Add the property to relationship
                fromEntity.relationships[rel.type].properties[propName] = propDefinition
                debug(`[toOntology] Added property '${propName}' to relationship '${rel.type}'`)
             } else {
                // Fallback for malformed data
                fromEntity.relationships[rel.type].properties[propName] = { 
                  type: 'string', 
          description: propName
        }
                debug(`[toOntology] Added default property '${propName}' to relationship '${rel.type}'`)
             }
          }
          
          // Log the final properties that were added to the ontology
          debug(`[toOntology] Final properties for relationship '${rel.type}':`, 
                     JSON.stringify(fromEntity.relationships[rel.type].properties, null, 2))
        } else {
          debug(`[toOntology] Relationship '${rel.type}' has no properties to add`)
        }
      } else {
        debugWarn(`[toOntology] Cannot process relationship: missing nodes or captions`)
      }
    })
    
    debug('[toOntology] Final ontology object:', JSON.stringify(ontology, null, 2))
    return ontology
  },
  reset: () => {
    set(() => createBaseState())
  }
}))
