import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Entity as EntityType, Property, Relationship } from '../types/entity'
import { Section as SectionType } from '../types/section'

export interface ValidationError {
  type: 'error' | 'warning'
  message: string
  path?: string[]
}

export interface Section {
  id: string
  name: string
  description?: string
  type: 'mandatory' | 'custom' | 'system'
  entities: string[]
  order: number
  isLocked?: boolean
  parentId?: string
  children: string[]
  validationErrors?: ValidationError[]
  isValid?: boolean
}

interface OntologyState {
  sections: Section[]
  entities: EntityType[]
  relationships: Relationship[]
  selectedView: 'tree' | 'graph'
  selectedEntity: string | null
  undoStack: any[]
  redoStack: any[]
  isLoading: boolean
  loadingMessage?: string
  
  // Actions
  addSection: (section: Omit<Section, 'id' | 'order' | 'entities' | 'children'>) => void
  removeSection: (id: string) => void
  updateSection: (id: string, updates: Partial<Section>) => void
  reorderSection: (id: string, newOrder: number) => void
  moveSection: (id: string, targetId: string | null) => void
  addEntity: (entity: EntityType) => void
  updateEntity: (id: string, updates: Partial<EntityType>) => void
  deleteEntity: (entityId: string) => void
  moveEntity: (entityId: string, newSection: string) => void
  addRelationship: (relationship: Relationship) => void
  updateRelationship: (id: string, updates: Partial<Relationship>) => void
  deleteRelationship: (id: string) => void
  setSelectedView: (view: 'tree' | 'graph') => void
  setSelectedEntity: (id: string | null) => void
  updateEntityPosition: (id: string, position: { x: number; y: number }) => void
  validateSection: (id: string) => void
  setLoading: (isLoading: boolean, message?: string) => void
  undo: () => void
  redo: () => void
}

export const useOntologyStore = create<OntologyState>()(
  devtools(
    (set, get) => ({
      sections: [],
      entities: [],
      relationships: [],
      selectedView: 'tree',
      selectedEntity: null,
      undoStack: [],
      redoStack: [],
      isLoading: false,
      loadingMessage: undefined,

      setLoading: (isLoading, message) => {
        set({ isLoading, loadingMessage: message })
      },

      validateSection: (id) => {
        set((state) => {
          const section = state.sections.find((s) => s.id === id)
          if (!section || section.isValid) return state // Skip if already valid

          const errors: ValidationError[] = []
          
          // Validate name
          if (!section.name.trim()) {
            errors.push({
              type: 'error',
              message: 'Section name is required',
              path: ['name']
            })
          }

          // Validate entities
          section.entities.forEach((entityId, index) => {
            const entity = get().entities.find(e => e.id === entityId)
            if (!entity) {
              errors.push({
                type: 'error',
                message: `Invalid entity reference: ${entityId}`,
                path: ['entities', index.toString()]
              })
            }
          })

          // Validate parent reference
          if (section.parentId) {
            const parent = get().sections.find(s => s.id === section.parentId)
            if (!parent) {
              errors.push({
                type: 'error',
                message: `Invalid parent section reference: ${section.parentId}`,
                path: ['parentId']
              })
            }
          }

          return {
            sections: state.sections.map((s) =>
              s.id === id
                ? { ...s, validationErrors: errors, isValid: errors.length === 0 }
                : s
            )
          }
        })
      },

      addSection: (sectionData) => {
        const sections = get().sections
        const newSection: Section = {
          id: crypto.randomUUID(),
          entities: [],
          children: [],
          order: sections.length,
          ...sectionData,
          isLocked: sectionData.type === 'mandatory'
        }
        set((state) => ({
          sections: [...state.sections, newSection],
          undoStack: [...state.undoStack, { type: 'ADD_SECTION', data: newSection }]
        }))
      },

      removeSection: (id) => {
        const section = get().sections.find(s => s.id === id)
        if (!section || section.isLocked) return

        set((state) => {
          const removedSections = new Set([id, ...getAllChildrenIds(state.sections, id)])
          const remainingSections = state.sections
            .filter(s => !removedSections.has(s.id))
            .map((s, i) => ({ ...s, order: i }))

          return {
            sections: remainingSections,
            undoStack: [...state.undoStack, { 
              type: 'REMOVE_SECTION', 
              data: state.sections.filter(s => removedSections.has(s.id))
            }]
          }
        })
      },

      moveSection: (id, targetId) => {
        const section = get().sections.find(s => s.id === id)
        const targetSection = targetId ? get().sections.find(s => s.id === targetId) : null
        
        if (!section || section.isLocked) return
        if (targetSection?.isLocked) return
        if (targetId && isCircularReference(get().sections, id, targetId)) return

        set((state) => {
          const updatedSections = state.sections.map(s => {
            if (s.id === section.id) {
              return { 
                ...s, 
                parentId: targetId || undefined,
                order: targetSection ? targetSection.children.length : state.sections.length 
              }
            }
            if (s.id === targetId) {
              return { 
                ...s, 
                children: [...s.children, section.id] 
              }
            }
            if (s.id === section.parentId) {
              return { 
                ...s, 
                children: s.children.filter(childId => childId !== section.id) 
              }
            }
            return s
          })

          return {
            sections: updatedSections,
            undoStack: [...state.undoStack, { 
              type: 'MOVE_SECTION', 
              data: { 
                sectionId: id, 
                oldParentId: section.parentId, 
                newParentId: targetId 
              } 
            }]
          }
        })
      },

      updateSection: (id, updates) => {
        const section = get().sections.find(s => s.id === id)
        if (!section || (section.isLocked && (updates.name || updates.order !== undefined || updates.type !== undefined))) return

        set((state) => ({
          sections: state.sections.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
          undoStack: [...state.undoStack, { type: 'UPDATE_SECTION', data: { id, updates } }]
        }))
      },

      reorderSection: (id, newOrder) => {
        const section = get().sections.find(s => s.id === id)
        if (!section || section.isLocked) return

        set((state) => {
          const oldOrder = section.order
          const updatedSections = state.sections.map(s => {
            if (s.id === id) return { ...s, order: newOrder }
            if (s.isLocked) return s
            if (oldOrder < newOrder && s.order <= newOrder && s.order > oldOrder) {
              return { ...s, order: s.order - 1 }
            }
            if (oldOrder > newOrder && s.order >= newOrder && s.order < oldOrder) {
              return { ...s, order: s.order + 1 }
            }
            return s
          })

          return {
            sections: updatedSections,
            undoStack: [...state.undoStack, { type: 'REORDER_SECTION', data: { id, oldOrder, newOrder } }]
          }
        })
      },

      addEntity: (entity) => {
        const section = get().sections.find(s => s.id === entity.section)
        if (!section) return

        set(state => {
          const newEntity = {
            ...entity,
            position: { x: 0, y: 0 }
          }
          return {
            entities: [...state.entities, newEntity],
            sections: state.sections.map(s => 
              s.id === entity.section
                ? { ...s, entities: [...s.entities, entity.id] }
                : s
            )
          }
        })
      },

      updateEntity: (id, updates) => {
        set((state) => ({
          entities: state.entities.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
          undoStack: [...state.undoStack, { type: 'UPDATE_ENTITY', data: { id, updates } }]
        }))
      },

      deleteEntity: (entityId: string) => {
        set(state => {
          // Remove entity from its section
          const sections = state.sections.map(section => ({
            ...section,
            entities: section.entities.filter(id => id !== entityId)
          }))

          // Remove entity from entities array
          const entities = state.entities.filter(e => e.id !== entityId)

          // Remove any relationships that reference this entity
          const relationships = state.relationships.filter(
            rel => rel.sourceId !== entityId && rel.targetId !== entityId
          )

          return { sections, entities, relationships }
        })
      },

      moveEntity: (entityId, newSection) => {
        set((state) => {
          const entity = state.entities.find((e) => e.id === entityId)
          if (!entity) return state

          const oldSection = entity.section

          return {
            entities: state.entities.map((e) =>
              e.id === entityId ? { ...e, section: newSection } : e
            ),
            sections: state.sections.map((s) => {
              if (s.id === oldSection) {
                return {
                  ...s,
                  entities: s.entities.filter((id) => id !== entityId)
                }
              }
              if (s.id === newSection) {
                return {
                  ...s,
                  entities: [...s.entities, entityId]
                }
              }
              return s
            })
          }
        })
      },

      addRelationship: (relationship) => {
        set((state) => ({
          relationships: [...state.relationships, relationship],
          undoStack: [...state.undoStack, { type: 'ADD_RELATIONSHIP', data: relationship }]
        }))
      },

      updateRelationship: (id, updates) => {
        set((state) => ({
          relationships: state.relationships.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
          undoStack: [...state.undoStack, { type: 'UPDATE_RELATIONSHIP', data: { id, updates } }]
        }))
      },

      deleteRelationship: (id) => {
        set((state) => ({
          relationships: state.relationships.filter((r) => r.id !== id),
          undoStack: [...state.undoStack, { type: 'DELETE_RELATIONSHIP', data: id }]
        }))
      },

      setSelectedView: (view) => set({ selectedView: view }),
      setSelectedEntity: (id) => set({ selectedEntity: id }),
      
      updateEntityPosition: (id, position) => {
        set((state) => ({
          entities: state.entities.map((e) =>
            e.id === id ? { ...e, position } : e
          )
        }))
      },

      undo: () => {
        const state = get()
        const lastAction = state.undoStack[state.undoStack.length - 1]
        if (!lastAction) return

        // Implementation of undo logic based on action type
        // This is a simplified version - you'd need to implement the actual undo logic
        set((state) => ({
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [...state.redoStack, lastAction]
        }))
      },

      redo: () => {
        const state = get()
        const lastAction = state.redoStack[state.redoStack.length - 1]
        if (!lastAction) return

        // Implementation of redo logic based on action type
        // This is a simplified version - you'd need to implement the actual redo logic
        set((state) => ({
          redoStack: state.redoStack.slice(0, -1),
          undoStack: [...state.undoStack, lastAction]
        }))
      }
    }),
    { name: 'ontology-store' }
  )
)

// Helper functions
function getAllChildrenIds(sections: Section[], parentId: string): string[] {
  const children = sections
    .filter(s => s.parentId === parentId)
    .map(s => s.id)
  
  return [
    ...children,
    ...children.flatMap(childId => getAllChildrenIds(sections, childId))
  ]
}

function isCircularReference(sections: Section[], sourceId: string, targetId: string): boolean {
  if (sourceId === targetId) return true
  
  const targetSection = sections.find(s => s.id === targetId)
  if (!targetSection?.parentId) return false
  
  return isCircularReference(sections, sourceId, targetSection.parentId)
}
