import type { Node as NvlNode, Relationship as NvlRelationship } from '@neo4j-nvl/base'

export interface Node extends Omit<NvlNode, 'id'> {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
}

export interface Edge extends Omit<NvlRelationship, 'id' | 'from' | 'to'> {
  source: string;
  target: string;
  label: string;
  properties?: Record<string, any>;
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export interface FileWithPreview extends File {
  preview?: string;
}

export interface TransformResponse {
  status: 'success' | 'error';
  data?: GraphData;
  error?: string;
  progress?: number;
}
