import { NextResponse } from 'next/server'
import { getBackendAuthHeaders, isUnauthorizedError } from '@/lib/auth-utils'
import { resolveRouteParams } from '@/app/api/_utils/route-helpers'

export async function GET(
  request: Request,
  context: any
) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({ accept: 'application/json' })

    const { id } = await resolveRouteParams<{ id: string }>(context?.params)

    // Create an AbortController with a longer timeout for status checks
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

    try {
      const response = await fetch(
        `${backendBaseUrl}/api/v1/transform/status/${id}`,
        {
          method: 'GET',
          headers,
          signal: controller.signal
        }
      )
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()

        // Handle specific error cases
        if (response.status === 404) {
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.detail && errorData.detail.includes('not found for user')) {
              return NextResponse.json({
                error: 'Access denied',
                message: 'You do not have permission to access this transform',
                type: 'access_denied'
              }, { status: 403 })
            }
          } catch {
            // If parsing fails, use generic 404 message
          }
          return NextResponse.json({
            error: 'Transform not found',
            message: 'The requested transform could not be found',
            type: 'not_found'
          }, { status: 404 })
        }

        // For other errors, try to parse and return meaningful message
        try {
          const errorData = JSON.parse(errorText)
          return NextResponse.json({
            error: errorData.detail || 'Failed to fetch transform status',
            message: errorData.detail || 'An error occurred while fetching the transform status',
            type: 'api_error'
          }, { status: response.status })
        } catch {
          // If JSON parsing fails, return the raw error
          return NextResponse.json({
            error: 'Failed to fetch transform status',
            message: errorText || 'An unknown error occurred',
            type: 'unknown_error'
          }, { status: response.status })
        }
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch (fetchError: any) {
      clearTimeout(timeoutId)

      // Handle abort error (timeout)
      if (fetchError.name === 'AbortError') {
        console.warn('Transform status check timed out after 60s for transform:', id)
        return NextResponse.json(
          {
            error: 'Request timeout',
            message: 'The transform status check took too long. The transform may still be processing.',
            type: 'timeout'
          },
          { status: 504 }
        )
      }
      throw fetchError
    }
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error checking transform status:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An internal error occurred while checking transform status',
        type: 'internal_error'
      },
      { status: 500 }
    )
  }
}
