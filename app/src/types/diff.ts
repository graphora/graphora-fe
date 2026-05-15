/**
 * B3-diff payload types.
 *
 * Mirrors the dataclasses in graphora_server/services/diff_service.py.
 * The two halves must be edited in lockstep when fields change — the
 * server-side dataclasses are the source of truth.
 */

import type { Edge, Node } from './graph'

/** Per-property delta within a changed node/edge. */
export interface PropertyChange {
  base: unknown
  compare: unknown
}

/**
 * A node that exists in both transforms with different
 * user-meaningful properties.
 *
 * ``base_id`` / ``compare_id`` are the transform-scoped ids so
 * the rendering layer can deep-link to either side; they differ
 * when ER produced a fresh id on the new transform.
 */
export interface NodeDelta {
  canonical_id: string | null
  type: string
  base_id: string
  compare_id: string
  property_changes: Record<string, PropertyChange>
}

/** Edge counterpart to NodeDelta. */
export interface EdgeDelta {
  source_key: string
  target_key: string
  type: string
  base_id: string
  compare_id: string
  property_changes: Record<string, PropertyChange>
}

export interface DiffSummary {
  nodes_added: number
  nodes_removed: number
  nodes_changed: number
  nodes_unchanged: number
  edges_added: number
  edges_removed: number
  edges_changed: number
  edges_unchanged: number
}

export interface GraphDiff {
  base_transform_id: string
  compare_transform_id: string
  summary: DiffSummary
  added_nodes: Node[]
  removed_nodes: Node[]
  changed_nodes: NodeDelta[]
  added_edges: Edge[]
  removed_edges: Edge[]
  changed_edges: EdgeDelta[]
}
