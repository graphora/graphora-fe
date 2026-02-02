import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/server-auth'
import type { ConnectionTestResponse } from '@/types/config'

export const runtime = 'nodejs'

const CONNECTION_TIMEOUT_MS = 10_000
const MAX_CONNECTION_LIFETIME_MS = 30_000
const ACQUISITION_TIMEOUT_MS = 10_000

const successResponse: ConnectionTestResponse = {
  success: true,
  message: 'Connection successful! Neo4j database is reachable and responding correctly.'
}

const invalidParamsResponse: ConnectionTestResponse = {
  success: false,
  message: 'Missing required connection parameters',
  error: 'URI, username, and password are required'
}

const invalidProtocolResponse: ConnectionTestResponse = {
  success: false,
  message: 'Invalid Neo4j URI format',
  error: 'URI must start with neo4j://, bolt://, neo4j+s://, or bolt+s://'
}

const toNumber = (maybeInt: unknown): number => {
  if (typeof maybeInt === 'number') {
    return maybeInt
  }

  if (typeof maybeInt === 'object' && maybeInt !== null && 'toNumber' in maybeInt && typeof maybeInt.toNumber === 'function') {
    try {
      return maybeInt.toNumber()
    } catch {
      return Number.NaN
    }
  }

  return Number.NaN
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getServerAuth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { uri, username, password } = body ?? {}

    if (!uri || !username || !password) {
      return NextResponse.json(invalidParamsResponse, { status: 400 })
    }

    const normalizedUri = String(uri)
    if (!/^neo4j(\+s)?:\/\//.test(normalizedUri) && !/^bolt(\+s)?:\/\//.test(normalizedUri)) {
      return NextResponse.json(invalidProtocolResponse, { status: 400 })
    }

    const neo4j = await import('neo4j-driver')
    const connection = neo4j.driver(normalizedUri, neo4j.auth.basic(String(username), String(password)), {
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      maxConnectionLifetime: MAX_CONNECTION_LIFETIME_MS,
      maxConnectionPoolSize: 1,
      connectionAcquisitionTimeout: ACQUISITION_TIMEOUT_MS,
      disableLosslessIntegers: false
    })

    const session = connection.session()

    try {
      const result = await session.run('RETURN 1 as test, "Hello Neo4j" as message')
      const record = result.records[0]

      if (!record) {
        return NextResponse.json({
          success: false,
          message: 'Connection test failed',
          error: 'No records returned from test query'
        })
      }

      const testValue = toNumber(record.get('test'))
      if (Number.isNaN(testValue) || testValue !== 1) {
        return NextResponse.json({
          success: false,
          message: 'Connection test failed',
          error: `Unexpected response from database. Expected 1, received ${testValue}`
        })
      }

      return NextResponse.json(successResponse)
    } finally {
      await session.close()
      await connection.close()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    let friendlyMessage = 'Connection failed'
    let friendlyDetail = message

    if (/authentication|credentials/i.test(message)) {
      friendlyMessage = 'Authentication failed'
      friendlyDetail = 'Invalid username or password'
    } else if (/timeout/i.test(message)) {
      friendlyMessage = 'Connection timeout'
      friendlyDetail = 'Database did not respond within the timeout period'
    } else if (/ENOTFOUND|ECONNREFUSED|ServiceUnavailable/i.test(message)) {
      friendlyMessage = 'Database unreachable'
      friendlyDetail = 'Unable to reach the Neo4j instance. Verify the URI and network connectivity.'
    }

    console.error('Neo4j connection test failed:', friendlyDetail)

    const response: ConnectionTestResponse = {
      success: false,
      message: friendlyMessage,
      error: friendlyDetail
    }

    return NextResponse.json(response, { status: 500 })
  }
}
