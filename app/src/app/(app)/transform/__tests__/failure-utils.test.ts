import { describe, expect, it } from 'vitest'

import { formatTransformFailureMessage } from '../failure-utils'

describe('formatTransformFailureMessage', () => {
  it('returns default message for empty payload', () => {
    expect(formatTransformFailureMessage(undefined)).toBe('Processing failed. Please retry.')
    expect(formatTransformFailureMessage(null)).toBe('Processing failed. Please retry.')
  })

  it('includes mapped failure reason and error message when provided', () => {
    const payload = {
      failure_reason: 'llm_unavailable',
      error_summary: {
        error_message: 'The upstream model returned 503',
      },
    }

    expect(formatTransformFailureMessage(payload)).toBe(
      'Language model was temporarily unavailable: The upstream model returned 503',
    )
  })

  it('falls back to code when no additional context exists', () => {
    const payload = {
      failure_details: {
        code: 'storage_failed',
      },
    }

    expect(formatTransformFailureMessage(payload)).toBe('Processing failed (storage_failed). Please retry.')
  })

  it('deduplicates repeated messages', () => {
    const payload = {
      failure_reason: 'chunking_failed',
      failure_details: {
        message: 'chunk size too small',
        details: {
          message: 'chunk size too small',
        },
      },
    }

    expect(formatTransformFailureMessage(payload)).toBe('Chunking configuration failed: chunk size too small')
  })
})
