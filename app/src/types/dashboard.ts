export type LLMUsageSummary = {
  total_calls: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
  estimated_cost_usd: number | null
  models_used: string[]
}

export type TransformRunSummary = {
  transform_id: string
  session_id?: string | null
  document_name: string
  document_type: string
  document_size_bytes: number
  page_count: number
  processing_status: string
  processing_started_at: string
  processing_completed_at?: string | null
  processing_duration_ms?: number | null
  chunks_created: number
  nodes_extracted: number
  relationships_extracted: number
  quality_score?: number | null
  quality_gate_status?: string | null
  quality_requires_review?: boolean | null
  quality_gate_reasons: string[]
  llm_usage: LLMUsageSummary
}

export type RecentRunsResponse = {
  runs: TransformRunSummary[]
  window_start: string
  window_end: string
}

export type DashboardSummary = {
  window_start: string
  window_end: string
  total_runs: number
  completed_runs: number
  failed_runs: number
  running_runs: number
  pass_count: number
  warn_count: number
  fail_count: number
  requires_review_count: number
  average_duration_ms: number | null
  p50_duration_ms: number | null
  p95_duration_ms: number | null
  average_tokens_per_run: number | null
  total_tokens: number
  total_llm_calls: number
  total_estimated_cost_usd: number | null
  runs_per_day: number | null
  recent_gate_reasons: string[]
}

export type PerformanceTimeseriesPoint = {
  date: string
  runs: number
  average_duration_ms: number | null
  p95_duration_ms: number | null
  total_tokens: number
  total_llm_calls: number
  total_estimated_cost_usd: number | null
}

export type DashboardPerformance = {
  window_start: string
  window_end: string
  total_runs: number
  total_tokens: number
  total_llm_calls: number
  total_estimated_cost_usd: number | null
  timeseries: PerformanceTimeseriesPoint[]
}

export type QualityReasonStat = {
  reason: string
  count: number
}

export type QualityRuleStat = {
  rule_id: string
  severity: string
  count: number
}

export type EntityCoverageStat = {
  entity_type: string
  count: number
}

export type EntityConfidenceStat = {
  entity_type: string
  average_confidence: number
}

export type DashboardQuality = {
  window_start: string
  window_end: string
  average_score: number | null
  p50_score: number | null
  p95_score: number | null
  pass_count: number
  warn_count: number
  fail_count: number
  requires_review_count: number
  recent_reasons: QualityReasonStat[]
  top_rules: QualityRuleStat[]
  entity_coverage: EntityCoverageStat[]
  entity_confidence: EntityConfidenceStat[]
}
