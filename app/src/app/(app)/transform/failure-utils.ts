const FAILURE_REASON_MESSAGES: Record<string, string> = {
  quality_gate_failed: 'Quality validation failed the hard gate',
  no_graph_generated: 'No knowledge graph was generated from the document',
  llm_unavailable: 'Language model was temporarily unavailable',
  parse_failed: 'Document parsing failed',
  chunking_failed: 'Chunking configuration failed',
  transform_execution_failed: 'Transform execution failed',
  storage_failed: 'Graph storage failed',
  unknown_error: 'An unexpected error occurred during transform',
}

const toSentenceCase = (value: string): string =>
  value
    .replace(/[_\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(\w)/, (match) => match.toUpperCase())

const appendUnique = (parts: string[], value?: unknown) => {
  if (typeof value !== 'string') {
    return
  }
  const normalized = value.trim()
  if (!normalized) {
    return
  }
  if (!parts.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
    parts.push(normalized)
  }
}

export const formatTransformFailureMessage = (payload: any): string => {
  if (!payload || typeof payload !== 'object') {
    return 'Processing failed. Please retry.'
  }

  const parts: string[] = []
  const reasonKey = payload.failure_reason || payload.failureReason
  if (typeof reasonKey === 'string') {
    const normalizedKey = reasonKey.toLowerCase()
    appendUnique(parts, FAILURE_REASON_MESSAGES[normalizedKey] ?? toSentenceCase(reasonKey))
  }

  const failureDetails = (payload.failure_details as Record<string, any> | undefined) || {}
  const nestedDetails = (failureDetails.details as Record<string, any> | undefined) || {}

  const messageCandidates = [
    payload.error_summary?.error_message,
    failureDetails.message,
    nestedDetails.message,
    nestedDetails.error,
    nestedDetails.reason,
    nestedDetails.underlying_message,
    nestedDetails.description,
    payload.message,
    payload.error_summary?.error_type,
  ]

  messageCandidates.forEach((candidate) => appendUnique(parts, candidate))
  appendUnique(parts, nestedDetails.recovery_instructions || failureDetails.recovery_instructions)

  if (parts.length > 0) {
    return parts.join(': ')
  }

  const failureCode = failureDetails.code || payload.failure_code
  if (typeof failureCode === 'string' && failureCode.trim()) {
    return `Processing failed (${failureCode.trim()}). Please retry.`
  }

  return 'Processing failed. Please retry.'
}
