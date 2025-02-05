export enum YAMLUpdateTrigger {
  VISUAL_EDIT = 'visual_edit',
  PROPERTY_CHANGE = 'property_change',
  RELATIONSHIP_CHANGE = 'relationship_change',
  MANUAL_REFRESH = 'manual_refresh',
  AUTO_SAVE = 'auto_save'
}

export interface YAMLUpdateEvent {
  trigger: YAMLUpdateTrigger
  timestamp: number
  changes: Array<{
    path: string[]
    oldValue: any
    newValue: any
  }>
}

export interface YAMLStructure {
  sections: {
    [key: string]: string[]
    Metadata: string[] // Required
  }
  entities: {
    Metadata: {
      properties: Record<string, PropertyDefinition>
      relationships?: Record<string, RelationshipDefinition>
    }
    [key: string]: EntityDefinition
  }
}

export interface PropertyDefinition {
  type: 'str' | 'int' | 'float' | 'bool' | 'date'
  description?: string
  required?: boolean
  unique?: boolean
  index?: boolean
}

export interface RelationshipDefinition {
  type: string
  target: string
  direction?: 'outgoing' | 'incoming'
  description?: string
}

export interface EntityDefinition {
  properties: Record<string, PropertyDefinition>
  relationships?: Record<string, RelationshipDefinition>
  description?: string
}
