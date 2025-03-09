import { create } from 'zustand'
import { Vector } from '@/lib/utils/vector'
import { Point } from '@/lib/utils/point'
import { v4 as uuidv4 } from 'uuid'

// Types
export interface Node {
  id: string
  position: Point
  caption: string
  labels: string[]
  properties: Record<string, any>
  style: Record<string, any>
}

export interface Relationship {
  id: string
  from: string
  to: string
  type: string
  properties: Record<string, any>
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
  
  // Actions
  addNode: (position: Point, caption?: string, labels?: string[]) => string
  updateNode: (id: string, updates: Partial<Node>) => void
  deleteNode: (id: string) => void
  
  addRelationship: (fromId: string, toId: string, type?: string) => string
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
  graph: {
    nodes: {},
    relationships: {},
    style: DEFAULT_STYLE
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
  
  // Node actions
  addNode: (position, caption = '', labels = []) => {
    const id = uuidv4()
    const nodeColor = getEntityColor(caption)
    
    set(state => ({
      graph: {
        ...state.graph,
        nodes: {
          ...state.graph.nodes,
          [id]: {
            id,
            position,
            caption,
            labels,
            properties: {},
            style: { 
              ...DEFAULT_NODE_STYLE,
              'node-color': nodeColor,
              'border-color': nodeColor === getEntityColor('Company') 
                ? DEFAULT_NODE_STYLE['border-color'] 
                : adjustColor(nodeColor, -20) // Darker border
            }
          }
        }
      }
    }))
    return id
  },
  
  updateNode: (id, updates) => {
    set(state => {
      const node = state.graph.nodes[id]
      if (!node) return state
      
      // If caption is updated, update the node color
      let updatedStyle = { ...node.style }
      if (updates.caption && updates.caption !== node.caption) {
        const nodeColor = getEntityColor(updates.caption)
        updatedStyle = {
          ...updatedStyle,
          'node-color': nodeColor,
          'border-color': nodeColor === getEntityColor('Company') 
            ? DEFAULT_NODE_STYLE['border-color'] 
            : adjustColor(nodeColor, -20)
        }
      }
      
      return {
        graph: {
          ...state.graph,
          nodes: {
            ...state.graph.nodes,
            [id]: {
              ...node,
              ...updates,
              style: updates.style ? { ...updatedStyle, ...updates.style } : updatedStyle
            }
          }
        }
      }
    })
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
  addRelationship: (fromId, toId, type = '') => {
    const id = uuidv4()
    set(state => ({
      graph: {
        ...state.graph,
        relationships: {
          ...state.graph.relationships,
          [id]: {
            id,
            from: fromId,
            to: toId,
            type,
            properties: {},
            style: { ...DEFAULT_RELATIONSHIP_STYLE }
          }
        }
      }
    }))
    return id
  },
  
  updateRelationship: (id, updates) => {
    set(state => {
      const relationship = state.graph.relationships[id]
      if (!relationship) return state
      
      return {
        graph: {
          ...state.graph,
          relationships: {
            ...state.graph.relationships,
            [id]: {
              ...relationship,
              ...updates
            }
          }
        }
      }
    })
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
    const { graph, selection, addNode, addRelationship } = get()
    
    // Map of original IDs to new IDs for nodes
    const nodeIdMap: Record<string, string> = {}
    
    // Duplicate nodes
    selection.nodes.forEach(id => {
      const node = graph.nodes[id]
      if (node) {
        const newPosition = new Point(node.position.x + 20, node.position.y + 20)
        const newId = addNode(newPosition, node.caption, [...node.labels])
        nodeIdMap[id] = newId
        
        // Copy properties and style
        set(state => {
          const newNode = state.graph.nodes[newId]
          return {
            graph: {
              ...state.graph,
              nodes: {
                ...state.graph.nodes,
                [newId]: {
                  ...newNode,
                  properties: { ...node.properties },
                  style: { ...node.style }
                }
              }
            }
          }
        })
      }
    })
    
    // Duplicate relationships (only if both nodes are in the selection)
    selection.relationships.forEach(id => {
      const relationship = graph.relationships[id]
      if (relationship && nodeIdMap[relationship.from] && nodeIdMap[relationship.to]) {
        const newId = addRelationship(
          nodeIdMap[relationship.from], 
          nodeIdMap[relationship.to], 
          relationship.type
        )
        
        // Copy properties and style
        set(state => {
          const newRelationship = state.graph.relationships[newId]
          return {
            graph: {
              ...state.graph,
              relationships: {
                ...state.graph.relationships,
                [newId]: {
                  ...newRelationship,
                  properties: { ...relationship.properties },
                  style: { ...relationship.style }
                }
              }
            }
          }
        })
      }
    })
    
    // Select the new nodes and relationships
    set(state => ({
      selection: {
        nodes: Object.values(nodeIdMap),
        relationships: [],
        isActive: true
      }
    }))
  },
  
  // Conversion to/from ontology
  fromOntology: (ontology) => {
    if (!ontology || !ontology.entities) {
      return
    }
    
    console.log('Converting ontology to graph:', ontology)
    
    // Clear existing graph
    set({
      graph: {
        nodes: {},
        relationships: {},
        style: DEFAULT_STYLE
      },
      selection: {
        nodes: [],
        relationships: [],
        isActive: false
      }
    })
    
    const { addNode, addRelationship, updateNode, updateRelationship } = get()
    
    // Map of entity names to node IDs
    const entityNodeMap: Record<string, string> = {}
    
    // Create nodes for entities
    const entities = Object.entries(ontology.entities || {})
    
    // Calculate a better layout - use a circular layout for better visibility
    const nodeCount = entities.length
    const radius = Math.max(300, nodeCount * 40)
    const centerX = 400
    const centerY = 300
    
    console.log(`Creating ${entities.length} nodes from ontology entities`)
    
    // First pass: create all nodes
    entities.forEach(([_, entityData]: [string, any], index) => {
      const entityName = entityData.name
      // Position nodes in a circle
      const angle = (index / nodeCount) * 2 * Math.PI
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      
      const position = new Point(x, y)
      
      // Use the entity name as the caption, not the index
      console.log(`Creating node for entity: ${entityName}`)
      const nodeId = addNode(position, entityName, [])
      entityNodeMap[entityName] = nodeId
      
      // Add properties
      if (entityData && entityData.properties) {
        const properties: Record<string, any> = {}
        
        // Convert the nested property structure to a flat object
        Object.entries(entityData.properties).forEach(([propName, propData]: [string, any]) => {
          if (propData && typeof propData === 'object') {
            properties[propName] = propData.type || 'str'
          } else {
            properties[propName] = String(propData)
          }
        })
        
        updateNode(nodeId, { properties })
      }
    })
    
    console.log('Entity to node mapping:', entityNodeMap)
    
    // Second pass: create all relationships
    let relationshipCount = 0
    
    entities.forEach(([_, entityData]: [string, any]) => {
      const entityName = entityData.name
      const fromNodeId = entityNodeMap[entityName]
      
      if (entityData && entityData.relationships && fromNodeId) {
        console.log(`Processing relationships for entity ${entityName}:`, entityData.relationships)
        
        Object.entries(entityData.relationships).forEach(([relType, relData]: [string, any]) => {
          console.log(`  Relationship ${relType}:`, relData)
          
          // Handle the relationship format in the YAML
          if (relData && typeof relData === 'object' && 'target' in relData) {
            const targetEntity = relData.target
            console.log(`    Target entity: ${targetEntity}`)
            
            if (targetEntity && entityNodeMap[targetEntity]) {
              const toNodeId = entityNodeMap[targetEntity]
              console.log(`    Creating relationship from ${entityName} (${fromNodeId}) to ${targetEntity} (${toNodeId})`)
              
              // Create the relationship
              const relId = addRelationship(fromNodeId, toNodeId, relType)
              relationshipCount++
              
              // Add relationship properties if they exist
              if (relData.properties) {
                const relProperties: Record<string, any> = {}
                
                // Convert the nested property structure to a flat object
                Object.entries(relData.properties).forEach(([propName, propData]: [string, any]) => {
                  if (propData && typeof propData === 'object') {
                    relProperties[propName] = propData.type || 'str'
                  } else {
                    relProperties[propName] = String(propData)
                  }
                })
                
                updateRelationship(relId, { properties: relProperties })
              }
            } else {
              console.warn(`    Target entity ${targetEntity} not found in entityNodeMap`)
            }
          } else if (Array.isArray(relData)) {
            // Handle array of target entities
            relData.forEach((targetEntity) => {
              if (typeof targetEntity === 'string' && entityNodeMap[targetEntity]) {
                const toNodeId = entityNodeMap[targetEntity]
                console.log(`    Creating relationship from ${entityName} (${fromNodeId}) to ${targetEntity} (${toNodeId})`)
                
                // Create the relationship
                addRelationship(fromNodeId, toNodeId, relType)
                relationshipCount++
              }
            });
          } else if (typeof relData === 'string') {
            // Handle direct string target
            const targetEntity = relData;
            if (entityNodeMap[targetEntity]) {
              const toNodeId = entityNodeMap[targetEntity]
              console.log(`    Creating relationship from ${entityName} (${fromNodeId}) to ${targetEntity} (${toNodeId})`)
              
              // Create the relationship
              addRelationship(fromNodeId, toNodeId, relType)
              relationshipCount++
            }
          } else {
            console.warn(`    Invalid relationship data format for ${relType}:`, relData)
          }
        })
      }
    })
    
    console.log(`Created ${relationshipCount} relationships`)
    
    // Apply a more sophisticated force-directed layout to improve node positions
    const iterations = 150
    const repulsionForce = 3000
    const attractionForce = 0.02
    const maxMovement = 10
    const coolingFactor = 0.98
    const minDistance = 150 // Minimum distance between nodes
    
    // Initialize temperature (controls maximum movement)
    let temperature = 200
    
    for (let i = 0; i < iterations; i++) {
      // Calculate forces for each node
      const forces: Record<string, { x: number, y: number }> = {}
      
      // Initialize forces
      Object.keys(get().graph.nodes).forEach(nodeId => {
        forces[nodeId] = { x: 0, y: 0 }
      })
      
      // Calculate repulsion forces between all nodes
      const nodes = Object.values(get().graph.nodes)
      for (let j = 0; j < nodes.length; j++) {
        for (let k = 0; k < nodes.length; k++) {
          if (j === k) continue
          
          const node1 = nodes[j]
          const node2 = nodes[k]
          
          const dx = node2.position.x - node1.position.x
          const dy = node2.position.y - node1.position.y
          const distanceSquared = dx * dx + dy * dy
          
          if (distanceSquared < 1) continue // Avoid division by zero
          
          const distance = Math.sqrt(distanceSquared)
          
          // Extra strong repulsion when nodes are too close
          let force = repulsionForce / distanceSquared
          if (distance < minDistance) {
            force *= (minDistance / distance) * 2
          }
          
          const fx = (dx / distance) * force
          const fy = (dy / distance) * force
          
          forces[node1.id].x -= fx
          forces[node1.id].y -= fy
        }
      }
      
      // Calculate attraction forces for relationships
      Object.values(get().graph.relationships).forEach(rel => {
        const fromNode = get().graph.nodes[rel.from]
        const toNode = get().graph.nodes[rel.to]
        
        if (!fromNode || !toNode) return
        
        const dx = toNode.position.x - fromNode.position.x
        const dy = toNode.position.y - fromNode.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 1) return // Avoid division by zero
        
        // Weaker attraction force for longer distances
        const force = Math.min(distance, 200) * attractionForce
        const fx = (dx / distance) * force
        const fy = (dy / distance) * force
        
        forces[fromNode.id].x += fx
        forces[fromNode.id].y += fy
        forces[toNode.id].x -= fx
        forces[toNode.id].y -= fy
      })
      
      // Apply forces to update node positions with temperature-based limiting
      let totalMovement = 0
      
      Object.entries(forces).forEach(([nodeId, force]) => {
        const node = get().graph.nodes[nodeId]
        if (!node) return
        
        // Calculate magnitude of force
        const magnitude = Math.sqrt(force.x * force.x + force.y * force.y)
        
        // Limit movement by temperature
        const limitedMagnitude = Math.min(magnitude, temperature)
        
        // Scale force to limited magnitude
        let fx = force.x
        let fy = force.y
        
        if (magnitude > 0) {
          fx = (force.x / magnitude) * limitedMagnitude
          fy = (force.y / magnitude) * limitedMagnitude
        }
        
        // Apply the force
        const newPosition = new Point(
          node.position.x + fx,
          node.position.y + fy
        )
        
        updateNode(nodeId, { position: newPosition })
        
        // Track total movement for convergence check
        totalMovement += Math.abs(fx) + Math.abs(fy)
      })
      
      // Cool down the temperature
      temperature *= coolingFactor
      
      // Check for convergence
      if (totalMovement < nodes.length * 0.5) {
        console.log(`Layout converged after ${i + 1} iterations`)
        break
      }
    }
    
    // Center the graph in the view
    const nodes = Object.values(get().graph.nodes)
    if (nodes.length > 0) {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      
      nodes.forEach(node => {
        minX = Math.min(minX, node.position.x)
        minY = Math.min(minY, node.position.y)
        maxX = Math.max(maxX, node.position.x)
        maxY = Math.max(maxY, node.position.y)
      })
      
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      
      // Set the view transformation to center the graph
      set(state => ({
        viewTransformation: {
          scale: 0.8,
          translate: new Vector(
            state.canvasSize.width / 2 - centerX * 0.8,
            state.canvasSize.height / 2 - centerY * 0.8
          )
        }
      }))
    }
    
    // Log the created graph for debugging
    console.log('Created graph from ontology:', get().graph)
  },
  
  toOntology: () => {
    const { graph } = get()
    
    console.log('Converting graph to ontology:', graph)
    
    const entities: Record<string, any> = {}
    
    // Convert nodes to entities
    Object.values(graph.nodes).forEach(node => {
      if (!node.caption) return // Skip nodes without captions
      
      const entityName = node.caption
      const entity: Record<string, any> = {
        properties: {}
      }
      
      // Convert flat properties to nested structure
      Object.entries(node.properties).forEach(([propName, propValue]) => {
        let typeStr: string = typeof propValue
        if (typeStr === 'number') {
          typeStr = Number.isInteger(propValue) ? 'int' : 'float'
        }
        
        entity.properties[propName] = {
          type: typeStr === 'object' ? 'str' : typeStr,
          description: propName
        }
      })
      entity.name = entityName
      entities[entityName] = entity
    })
    
    // Add relationships to entities
    Object.values(graph.relationships).forEach(relationship => {
      const fromNode = graph.nodes[relationship.from]
      const toNode = graph.nodes[relationship.to]
      
      if (!fromNode || !toNode || !fromNode.caption || !toNode.caption) return
      
      const fromEntityName = fromNode.caption
      const toEntityName = toNode.caption
      const relType = relationship.type || 'RELATES_TO'
      
      // Ensure the entity has a relationships object
      if (!entities[fromEntityName].relationships) {
        entities[fromEntityName].relationships = {}
      }
      
      // Add the relationship
      entities[fromEntityName].relationships[relType] = {
        target: toEntityName
      }
      
      // Add relationship properties if they exist
      if (Object.keys(relationship.properties).length > 0) {
        entities[fromEntityName].relationships[relType].properties = {}
        
        Object.entries(relationship.properties).forEach(([propName, propValue]) => {
          let typeStr: string = typeof propValue
          if (typeStr === 'number') {
            typeStr = Number.isInteger(propValue) ? 'int' : 'float'
          }
          
          entities[fromEntityName].relationships[relType].properties[propName] = {
            type: typeStr === 'object' ? 'str' : typeStr,
            description: propName
          }
        })
      }
    })
    
    // Log the created ontology for debugging
    const result = { 
      version: '0.1.0',
      entities: Object.values(entities)
    }
    
    console.log('Created ontology from graph:', result)
    
    return result
  }
}))