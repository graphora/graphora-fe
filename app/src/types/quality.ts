/**
 * Quality validation types for the frontend
 */

export type QualityRuleType = 'format' | 'business' | 'cross_entity' | 'distribution' | 'consistency';

export type QualitySeverity = 'error' | 'warning' | 'info';

export interface QualityViolation {
  rule_id: string;
  rule_type: QualityRuleType;
  severity: QualitySeverity;
  entity_type?: string;
  entity_id?: string;
  property_name?: string;
  relationship_type?: string;
  message: string;
  expected: string;
  actual: string;
  confidence: number;
  suggestion?: string;
  context: Record<string, any>;
}

export interface QualityMetrics {
  total_entities: number;
  total_relationships: number;
  total_properties: number;
  entities_with_violations: number;
  relationships_with_violations: number;
  total_violations: number;
  entity_violation_rate: number;
  relationship_violation_rate: number;
  overall_violation_rate: number;
  avg_entity_confidence: number;
  avg_relationship_confidence: number;
  confidence_scores_by_type: Record<string, number>;
  property_completeness_rate: number;
  entity_type_coverage: Record<string, number>;
}

export interface QualityResults {
  transform_id: string;
  overall_score: number;
  grade: string;
  requires_review: boolean;
  violations: QualityViolation[];
  metrics: QualityMetrics;
  violations_by_type: Record<QualityRuleType, number>;
  violations_by_severity: Record<QualitySeverity, number>;
  violations_by_entity_type: Record<string, number>;
  entity_quality_summary: Record<string, Record<string, number>>;
  validation_timestamp: string;
  validation_duration_ms: number;
  rules_applied: number;
  validation_config: Record<string, any>;
}

export interface QualityApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  message?: string;
}

export interface ViolationFilters {
  violation_type?: QualityRuleType;
  severity?: QualitySeverity;
  entity_type?: string;
  limit?: number;
  offset?: number;
}

export interface QualityActionRequest {
  transform_id: string;
  comment?: string;
}

export interface QualityActionResponse {
  message: string;
  transform_id: string;
  status: string;
  merge_id?: string;
  reason?: string;
}

export interface QualityHealthCheck {
  status: 'healthy' | 'unavailable';
  quality_api_available: boolean;
  message: string;
}