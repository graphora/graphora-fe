// Utility helpers for parsing quality gate information from transform status payloads.

export type QualityGateInsight = {
  status: string
  reasons: string[]
  message: string
}

const reasonSources = [
  'quality_gate_reasons',
  'qualityGateReasons',
  'gating_reasons',
  'gatingReasons',
  'reasons',
]

const statusSources = [
  'quality_gate_status',
  'qualityGateStatus',
  'gating_status',
  'gatingStatus',
  'status',
]

const messageSources = [
  'quality_gate_message',
  'qualityGateMessage',
  'message',
  'failure_message',
  'description',
]

const collectCandidateObjects = (payload: unknown): Record<string, any>[] => {
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const primary = payload as Record<string, any>

  const candidates: Record<string, any>[] = [primary]

  const potentialNested = [
    primary.quality,
    primary.quality_summary,
    primary.quality_summary?.details,
    primary.quality_results,
    primary.quality_validation,
    primary.quality_gate,
    primary.failure_details,
    primary.failure_details?.quality,
    primary.error_summary,
    primary.error_summary?.details,
  ]

  for (const value of potentialNested) {
    if (value && typeof value === 'object') {
      candidates.push(value as Record<string, any>)
    }
  }

  return candidates
}

const normalizeArray = (values: unknown[]): string[] => {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          const normalized = item.trim()
          if (normalized && !seen.has(normalized)) {
            seen.add(normalized)
            result.push(normalized)
          }
        }
      }
    } else if (typeof value === 'string') {
      const normalized = value.trim()
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized)
        result.push(normalized)
      }
    }
  }
  return result
}

export const extractQualityGateInsight = (
  payload: unknown,
): QualityGateInsight | null => {
  const candidates = collectCandidateObjects(payload)
  if (candidates.length === 0) {
    return null
  }

  let status: string | undefined
  const reasonAccumulator: unknown[] = []
  const messageAccumulator: unknown[] = []

  for (const candidate of candidates) {
    for (const key of statusSources) {
      const rawStatus = candidate[key]
      if (typeof rawStatus === 'string' && !status) {
        status = rawStatus.trim().toLowerCase()
        if (status) {
          break
        }
      }
    }

    for (const key of reasonSources) {
      const value = candidate[key]
      if (value !== undefined) {
        reasonAccumulator.push(value)
      }
    }

    for (const key of messageSources) {
      const msg = candidate[key]
      if (typeof msg === 'string') {
        messageAccumulator.push(msg)
      }
    }
  }

  if (!status) {
    return null
  }

  const reasons = normalizeArray(reasonAccumulator)
  const messages = normalizeArray(messageAccumulator)

  const message =
    messages[0] ||
    reasons[0] ||
    'Quality validation completed with warnings that require review.'

  return {
    status,
    reasons,
    message,
  }
}

export const isQualityGateWarning = (
  insight: QualityGateInsight | null | undefined,
): insight is QualityGateInsight => {
  if (!insight || !insight.status) {
    return false
  }

  const normalized = insight.status.trim().toLowerCase()
  return normalized === 'warn' || normalized === 'warning'
}
