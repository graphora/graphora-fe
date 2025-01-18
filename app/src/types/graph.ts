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

// Graph editing types
export type GraphOperation = 
  | { type: 'CREATE_NODE'; payload: Omit<Node, 'id'> }
  | { type: 'UPDATE_NODE'; payload: { id: string; properties: Record<string, any> } }
  | { type: 'DELETE_NODE'; payload: { id: string } }
  | { type: 'CREATE_EDGE'; payload: Omit<Edge, 'id'> }
  | { type: 'UPDATE_EDGE'; payload: { id: string; properties: Record<string, any> } }
  | { type: 'DELETE_EDGE'; payload: { id: string } }

export interface BatchOperationResponse {
  success: boolean;
  results: Array<{
    type: GraphOperation['type'];
    success: boolean;
    result: any;
  }>;
  errors: Array<{
    type: GraphOperation['type'];
    error: string;
  }>;
}

export interface GraphHistoryEntry {
  id: string;
  operation: GraphOperation;
  timestamp: string;
  user: string;
}

export interface GraphState {
  data: GraphData;
  history: GraphHistoryEntry[];
  undoStack: GraphOperation[];
  redoStack: GraphOperation[];
}

// Node types from ontology (mock for now)
export const NODE_TYPES = ['Person', 'Company', 'Project', 'Document'] as const;
export type NodeType = typeof NODE_TYPES[number];

// Edge types from ontology (mock for now)
export const EDGE_TYPES = ['WORKS_AT', 'MANAGES', 'CONTAINS', 'OWNS'] as const;
export type EdgeType = typeof EDGE_TYPES[number];
