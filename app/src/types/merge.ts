import { Node, Edge } from "./graph";

export type MergeStrategy = 'SAFE' | 'FORCE' | 'INTERACTIVE';

export type MergeStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'WAITING_FOR_INPUT' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface MergeInitRequest {
  sourceGraphId: string;
  targetGraphId: string;
  mergeStrategy: MergeStrategy;
}

export interface MergeStatusResponse {
  status: MergeStatus;
  progress: number;
  currentStep: string;
  requiresAction: boolean;
}

export interface MergeResponse {
  questionId: string;
  response: any;
  context: Record<string, any>;
}

export interface Option {
  id: string
  label: string
}

export interface PropertyDiff {
  staging: string
  prod: string
}

export interface Suggestion {
  suggestion_type: string
  description: string
  confidence: number
  affected_properties: string[]
}

export interface ConflictMessage {
  conflict_type: string
  description: string
  properties_affected: Record<string, PropertyDiff>
  suggestions: Suggestion[]
}

export interface ChatMessage {
  id?: string;
  role?: 'agent' | 'user' | 'system';
  content: string;
  timestamp: string;
  requiresAction?: boolean;
  questionId?: string;
  options?: Array<{
    id: string;
    label: string;
    value: any;
  }>;
  type?: 'question' | 'answer' | 'conflict' | 'status';
  conflict?: ConflictMessage;
}

export interface MergeEvent {
  type: 'PROGRESS' | 'QUESTION' | 'ERROR' | 'COMPLETE';
  payload: {
    mergeId: string;
    timestamp: string;
    data: any;
  };
}

export type NodeStatus = 'staging' | 'prod' | 'both'

export interface MergeVisualizationNode extends Node{
  id: string
  labels: string[]
  properties: Record<string, any>
  status: NodeStatus
  conflicts?: string[]
}

export interface MergeVisualizationEdge extends Edge{
  id: string
  source: string
  target: string
  type: string
  properties: Record<string, any>
  status: NodeStatus
}

export interface MergeVisualizationSummary {
  total_nodes: number
  new_nodes: number
  updated_nodes: number
  conflicts: number
  status: {
    new: number
    resolved: number
    needs_review: number
  }
}

export interface MergeVisualizationGraph {
  nodes: MergeVisualizationNode[]
  edges: MergeVisualizationEdge[]
  conflicts?: Record<string, any>[]
  summary?: MergeVisualizationSummary
}

export interface MergeVisualizationResponse {
  status: string
  data: MergeVisualizationGraph
}

export type MergeStageStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface MergeStage {
  name: string;
  status: MergeStageStatus;
  progress: number;
  start_time?: string;
  end_time?: string;
}

export interface MergeProgress {
  merge_id: string;
  overall_status: MergeStatus;
  overall_progress: number;
  current_stage: string;
  stages_progress?: MergeStage[];
  stages?: MergeStage[];
  start_time: string;
  estimated_end_time?: string;
  end_time?: string;
  error_message?: string;
  has_conflicts: boolean;
  conflict_count: number;
}
