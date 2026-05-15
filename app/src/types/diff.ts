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

/**
 * Per-category change counts.
 *
 * Reviewer-flagged on commit 4ce2fe2: the initial DiffSummary type
 * was flat (``nodes_added``, ``edges_added`` …), mirroring the
 * dataclass field names in graphora_server/services/diff_service.py.
 * But the WIRE shape — what JSON the /diff endpoint actually emits
 * — is nested: ``summary.nodes.added`` and ``summary.edges.added``
 * (see graphora_server/api/graph.py::_diff_to_dict). The
 * serializer re-keys deliberately so the frontend can render a 2x4
 * grid without per-category string parsing.
 *
 * Keep this type aligned with the SERVER SERIALIZER, not the
 * server's internal dataclass — the wire is the contract.
 */
export interface DiffCounts {
  added: number
  removed: number
  changed: number
  unchanged: number
}

export interface DiffSummary {
  nodes: DiffCounts
  edges: DiffCounts
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
