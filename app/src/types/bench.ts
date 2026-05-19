/**
 * B4-bench wire types.
 *
 * Mirrors the Pydantic models in
 * graphora_server/schemas/bench.py field-for-field. The two
 * halves must be edited in lockstep when fields change — the
 * server schemas are the source of truth.
 */

/** One extractor's score on one corpus entry. */
export interface BenchEntryScore {
  corpus_slug: string
  node_precision: number
  node_recall: number
  node_f1: number
  edge_precision: number
  edge_recall: number
  edge_f1: number
  node_true_positives: number
  node_false_positives: number
  node_false_negatives: number
  edge_true_positives: number
  edge_false_positives: number
  edge_false_negatives: number
  /**
   * Failure reason when this (extractor, slug) pair couldn't be
   * scored. ``null`` means scoring succeeded. Coverage gaps
   * (missing extractor output for a corpus entry) surface here
   * rather than as silent zero-F1 rows so the denominator stays
   * honest.
   */
  error: string | null
}

/** Aggregated scores for one extractor across the full corpus. */
export interface BenchExtractorReport {
  extractor_name: string
  total_entries: number
  scored_count: number
  /**
   * Number of corpus entries the extractor failed to score
   * (missing output, malformed JSON, etc.). Required field —
   * callers must NOT treat it as optional, since collapsing
   * errored + scored into one bucket hides coverage gaps.
   */
  errored_count: number
  /** Micro-averaged P/R/F1 — weighted by entity count. A
   * 50-node doc dominates a 3-node doc. Answers "across all
   * the entities, what fraction did the extractor get right?" */
  micro_node_precision: number
  micro_node_recall: number
  micro_node_f1: number
  micro_edge_precision: number
  micro_edge_recall: number
  micro_edge_f1: number
  /** Macro-averaged F1 — per-doc mean. Treats each doc equally.
   * Answers "across all the docs, what's the average per-doc
   * F1?" An extractor strong on dense docs and weak on sparse
   * ones will win on micro but lose on macro; the headline F1
   * alone would hide that. */
  macro_node_f1: number
  macro_edge_f1: number
  entries: BenchEntryScore[]
}

/** Top-level bench report envelope. */
export interface BenchRunReport {
  corpus_size: number
  extractor_count: number
  extractors: BenchExtractorReport[]
}
