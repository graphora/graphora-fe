export type PropertyType = 'str' | 'int' | 'float' | 'bool' | 'date';

export interface PropertyFlags {
  unique: boolean;
  required: boolean;
  index: boolean;
}

export interface Property {
  id: string;
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface Entity {
  id: string;
  name: string;
  properties: Property[];
  relationships: Relationship[];
  metadata?: {
    createdAt: Date;
    lastModified: Date;
  };
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  direction: 'outgoing' | 'incoming';
  metadata?: {
    createdAt: Date;
    lastModified: Date;
  };
}

export interface EntityFormData {
  name: string;
  properties: Property[];
}

export interface EntityValidation {
  name?: string;
  properties?: Record<string, {
    name?: string;
    type?: string;
    description?: string;
  }>;
}
