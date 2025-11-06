export interface LLMUsageSummary {
  total_calls: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd?: number | null;
  models_used: string[];
}

export interface TransformRunSummary {
  transform_id: string;
  session_id?: string | null;
  document_name: string;
  document_type: string;
  document_size_bytes: number;
  page_count: number;
  processing_status: string;
  processing_started_at: string;
  processing_completed_at?: string | null;
  processing_duration_ms?: number | null;
  chunks_created: number;
  nodes_extracted: number;
  relationships_extracted: number;
  quality_score?: number | null;
  quality_gate_status?: string | null;
  quality_requires_review?: boolean | null;
  quality_gate_reasons: string[];
  llm_usage: LLMUsageSummary;
}

export interface RecentRunsResponse {
  runs: TransformRunSummary[];
  window_start: string;
  window_end: string;
}
