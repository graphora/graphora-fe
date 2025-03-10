import { Node, Edge } from "./graph";

export type MergeStrategy = 'SAFE' | 'FORCE' | 'INTERACTIVE';

export type MergeStatus = 'pending' | 'running' | 'rolled_back' | 'completed' | 'failed' | 'cancelled';

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
  id: string
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
  elapsed_time?: number
}

export interface ConflictSeverity {
  level: 'critical' | 'major' | 'minor'
  label: string
  color: string
}

export interface ConflictListItem {
  id: string
  merge_id: string
  entity_id: string
  entity_name?: string
  entity_type: string
  conflict_type: string
  severity: 'critical' | 'major' | 'minor' | 'info'
  description: string
  resolved?: boolean
  resolution_status?: 'unresolved' | 'auto-resolved' | 'manually-resolved'
  resolution_confidence?: number
  property_name?: string | null
  staging_value?: any
  production_value?: any
  resolution?: {
    id: string
    description: string
    resolution_type: string
    resolution_data: Record<string, any>
    confidence: number
    reasoning: string
    requires_review: boolean
    auto_resolvable: boolean
    risks?: string[]
  }
  resolution_timestamp?: string
  resolved_by?: string
  requires_review?: boolean
  created_at: string
  updated_at: string
}

export interface ConflictListResponse {
  conflicts: ConflictListItem[]
  total_count: number
  summary: {
    total: number
    by_severity: Record<string, number>
    by_type: Record<string, number>
    resolved: number
    unresolved: number
  }
  limit?: number
  offset?: number
}

export interface ConflictListFilters {
  conflict_type?: string[]
  severity?: string[]
  resolution_status?: string[]
  entity_type?: string[]
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  limit?: number
  offset?: number
  created_after?: string
  created_before?: string
}
