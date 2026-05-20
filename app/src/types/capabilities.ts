/**
 * M-matrix wire types.
 *
 * Mirrors the Pydantic models in
 * graphora_server/schemas/capabilities.py field-for-field. The
 * two halves must be edited in lockstep when fields change —
 * the server schemas are the source of truth.
 */

/** Runtime-or-static feature flags for a graph storage backend. */
export interface BackendCapabilities {
  persistent: boolean
  full_text_indexes: boolean
  similarity_search: boolean
  embedding_similarity: boolean
  per_user_routing: boolean
}

/** One row in the M-matrix. */
export interface BackendMatrixEntry {
  /** STORAGE_TYPE value that selects this backend (e.g.,
   * 'neo4j', 'postgres', 'memory'). */
  name: string
  display_name: string
  /** Conservative/static capability set — the safe floor.
   * Live instances may report higher values for fields listed
   * in ``dynamic_flags``. */
  default_capabilities: BackendCapabilities
  /** Capability field names whose runtime value depends on
   * instance detection (e.g., AGE's ``full_text_indexes``
   * depends on pg_trgm install). Render the corresponding
   * cells with a "depends on runtime detection" annotation
   * rather than committing to the static default. */
  dynamic_flags: string[]
  /** Human-readable caveats that don't fit in boolean flags. */
  notes: string[]
  /** Pip extras to install for this backend; compose into
   * ``pip install 'graphora-server[X]'`` for the install hint.
   * Empty array = no extra needed. */
  extras: string[]
}

/** Wire envelope for ``GET /api/v1/capabilities/matrix``. */
export interface CapabilityMatrixResponse {
  backends: BackendMatrixEntry[]
}

/**
 * Display labels for each capability field. The matrix page
 * uses these as row labels — without an explicit map, the
 * page would have to derive labels from the snake_case field
 * names, which loses the operator-facing precision (``Full-text
 * indexes`` reads better than ``full_text_indexes``).
 *
 * Order matters — the page renders rows in this order, so
 * related concepts (persistence + full-text + similarity)
 * cluster visually.
 */
export const CAPABILITY_LABELS: ReadonlyArray<{
  field: keyof BackendCapabilities
  label: string
  description: string
}> = [
  {
    field: 'persistent',
    label: 'Persistence',
    description:
      'Survives process restart. False for in-memory; True for any backend that writes to disk or a remote database.',
  },
  {
    field: 'full_text_indexes',
    label: 'Full-text indexes',
    description:
      'Real index that accelerates CONTAINS-style queries. False means the methods are no-op or unavailable; correctness is preserved (scan fallback), only performance differs.',
  },
  {
    field: 'similarity_search',
    label: 'Similarity search',
    description:
      'find_similar_nodes returns real candidate matches. False means it returns an empty list — callers should treat as "no fuzzy fallback".',
  },
  {
    field: 'embedding_similarity',
    label: 'Embedding similarity',
    description:
      'Vector-distance similarity is wired (not just property-string fuzzy match). False on every backend today; flips True per-backend as embedding wiring lands upstream.',
  },
  {
    field: 'per_user_routing',
    label: 'Per-user DB routing',
    description:
      'UserDatabaseService carries per-user staging/prod connection details for this backend.',
  },
]
