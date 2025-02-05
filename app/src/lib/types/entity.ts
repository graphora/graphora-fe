export type PropertyType = 'str' | 'int' | 'float' | 'bool' | 'date';

export interface PropertyFlags {
  unique: boolean;
  required: boolean;
  index: boolean;
}

export interface PropertyDefinition {
  type: PropertyType;
  description?: string;
  unique?: boolean;
  required?: boolean;
  index?: boolean;
}

export interface RelationshipDefinition {
  target: string;
}

export interface Property {
  id: string;
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

export interface Entity {
  id: string;
  name: string;
  description?: string;
  section: string;
  isSection?: boolean;
  subsections?: string[];  // IDs of entities that are sections within this section
  properties: {
    [key: string]: PropertyDefinition;
  };
  relationships: {
    [key: string]: RelationshipDefinition;
  };
  childSections?: string[];  // Used for sections to list their child sections
  parentIds?: string[];  // Support multiple parent sections
  position?: {
    x: number;
    y: number;
  };
  usageCount: number;
  level?: number; // Nesting level for sections
  entityIds?: string[]; // Entity IDs for sections
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
}

export interface EntityFormData {
  name: string;
  isSection?: boolean;
  properties: {
    [key: string]: PropertyDefinition;
  };
  relationships: {
    [key: string]: RelationshipDefinition;
  };
}

export interface EntityValidation {
  name?: string;
  properties?: Record<string, {
    name?: string;
    type?: string;
    description?: string;
  }>;
}
