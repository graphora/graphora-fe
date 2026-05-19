/**
 * B1-prob contradictions payload types.
 *
 * Mirrors the Pydantic shape in
 * graphora_server/schemas/claims.py. The two halves must be
 * edited in lockstep when fields change — the server schemas
 * are the source of truth.
 */

/** One extractor's assertion about a target's property. */
export interface Claim {
  id: string
  transform_id: string
  target_id: string
  /** ``"node"`` or ``"edge"`` — the kind of target this claim is about. */
  target_kind: 'node' | 'edge' | string
  property_key: string
  /** The claimed property value. JSON-serializable. */
  value: unknown
  /** Extractor-reported confidence in [0.0, 1.0]. */
  confidence: number
  source_chunk_id: string | null
  source_extractor_model: string | null
  source_prompt_version: string | null
  user_id: string | null
  created_at: string | null
}

/**
 * A (target, property) pair carrying multiple distinct claimed
 * values. ``competing_claims`` is sorted by confidence DESC — the
 * "winning" value the pipeline picked is the first entry; the
 * rest are alternatives the contradiction detector wants you
 * to know about. ``severity`` is the distinct-value count
 * (always >= 2).
 */
export interface Contradiction {
  target_id: string
  target_kind: 'node' | 'edge' | string
  property_key: string
  competing_claims: Claim[]
  severity: number
}

/** Wire envelope for ``GET /api/v1/graph/{tx}/contradictions``. */
export interface ContradictionsResponse {
  transform_id: string
  min_confidence: number
  contradictions: Contradiction[]
  /**
   * Total claims for this transform at/above ``min_confidence`` —
   * NOT just the ones inside contradiction groups. Lets callers
   * distinguish "no writer yet" (count=0) from "writer healthy,
   * consistent data" (count>0, contradictions empty). This is
   * the load-bearing signal for the three empty states the UI
   * has to honor; see the backend's claims.py for the reviewer
   * history that pinned this.
   */
  total_claims_scanned: number
}
