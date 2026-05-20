/**
 * Sample gallery wire types.
 *
 * Mirrors the Pydantic models in graphora_server/schemas/samples.py
 * field-for-field. The two halves must be edited in lockstep.
 */

import type { GraphData } from './graph'

/** Lightweight entry for the gallery grid. */
export interface SampleSummary {
  slug: string
  display_name: string
  domain: string
  node_count: number
  edge_count: number
}

/** Full sample payload for the detail page. */
export interface SampleDetail {
  slug: string
  display_name: string
  domain: string
  document: string
  ontology_yaml: string
  /** Extracted graph in GraphResponse shape — fed directly into
   * the existing GraphVisualization component the Explorer uses. */
  expected_graph: GraphData
  /** Markdown source from golden/<slug>/README.md. The detail
   * page renders it as the "what this demonstrates" panel. */
  readme_markdown: string | null
}

export interface SamplesListResponse {
  samples: SampleSummary[]
  /** Unique domain names across all samples — drives the
   * filter-chip list without the gallery deriving them. */
  domains: string[]
}
