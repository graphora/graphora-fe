import { create } from 'zustand'
import { Entity } from '../types/entity'
import { Relationship } from '../types/relationship'
import { dump } from 'js-yaml'

interface OntologyStore {
  entities: Entity[]
  relationships: Relationship[]
  addEntity: (entity: Omit<Entity, 'id'>) => string
  updateEntity: (id: string, updates: Partial<Entity>) => void
  deleteEntity: (id: string) => void
  cloneEntity: (id: string) => void
  moveEntity: (entityId: string, targetSectionId: string | null) => void
  addRelationship: (relationship: Omit<Relationship, 'id'>) => string
  updateRelationship: (id: string, updates: Partial<Relationship>) => void
  deleteRelationship: (id: string) => void
  getYamlContent: () => string
}

export const useOntologyStore = create<OntologyStore>((set, get) => ({
  entities: [],
  relationships: [],

  addEntity: (entity) => {
    const id = Math.random().toString(36).substr(2, 9)
    set((state) => ({
      entities: [...state.entities, { ...entity, id }],
    }))
    return id
  },

  updateEntity: (id, updates) => {
    set((state) => ({
      entities: state.entities.map((entity) =>
        entity.id === id ? { ...entity, ...updates } : entity
      ),
    }))
  },

  deleteEntity: (id) => {
    set((state) => ({
      entities: state.entities.filter((entity) => entity.id !== id),
      relationships: state.relationships.filter(
        (rel) => rel.sourceId !== id && rel.targetId !== id
      ),
    }))
  },

  cloneEntity: (id) => {
    set((state) => {
      const entity = state.entities.find((e) => e.id === id)
      if (!entity) return state

      const newId = Math.random().toString(36).substr(2, 9)
      const clone = {
        ...entity,
        id: newId,
        name: `${entity.name} (Copy)`,
        parentIds: entity.parentIds ? [...entity.parentIds] : undefined,
      }

      return {
        entities: [...state.entities, clone],
      }
    })
  },

  moveEntity: (entityId, targetSectionId) => {
    set((state) => {
      const entity = state.entities.find((e) => e.id === entityId)
      if (!entity) return state

      if (entity.isSection && targetSectionId) {
        const targetSection = state.entities.find((e) => e.id === targetSectionId)
        if (!targetSection) return state

        const isDescendant = (sectionId: string, potentialAncestorId: string): boolean => {
          const section = state.entities.find((e) => e.id === sectionId)
          if (!section) return false
          if (!section.parentIds) return false
          if (section.parentIds.includes(potentialAncestorId)) return true
          return section.parentIds.some(parentId => isDescendant(parentId, potentialAncestorId))
        }

        if (isDescendant(targetSectionId, entityId)) {
          console.error('Cannot move section into its own descendant')
          return state
        }
      }

      return {
        entities: state.entities.map((e) =>
          e.id === entityId ? { ...e, parentIds: targetSectionId ? [targetSectionId] : undefined } : e
        ),
      }
    })
  },

  addRelationship: (relationship) => {
    const id = Math.random().toString(36).substr(2, 9)
    set((state) => ({
      relationships: [...state.relationships, { ...relationship, id }],
    }))
    return id
  },

  updateRelationship: (id, updates) => {
    set((state) => ({
      relationships: state.relationships.map((rel) =>
        rel.id === id ? { ...rel, ...updates } : rel
      ),
    }))
  },

  deleteRelationship: (id) => {
    set((state) => ({
      relationships: state.relationships.filter((rel) => rel.id !== id),
    }))
  },

  getYamlContent: () => {
    const state = get()
    const yamlObj = {
      entities: state.entities.map(({ id, name, type, isSection, parentIds }) => ({
        id,
        name,
        ...(type && { type }),
        ...(isSection && { isSection }),
        ...(parentIds && { parentIds }),
      })),
      relationships: state.relationships.map(({ id, sourceId, targetId, type }) => ({
        id,
        sourceId,
        targetId,
        type,
      })),
    }
    return dump(yamlObj)
  },
}))
