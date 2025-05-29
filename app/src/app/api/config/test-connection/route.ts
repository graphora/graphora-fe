import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ConnectionTestResponse } from '@/types/config'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { uri, username, password } = body

    console.log('Testing Neo4j connection with URI:', uri, 'Username:', username)

    // Validate required fields
    if (!uri || !username || !password) {
      const response: ConnectionTestResponse = {
        success: false,
        message: 'Missing required connection parameters',
        error: 'URI, username, and password are required'
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Validate URI format
    if (!uri.startsWith('neo4j://') && !uri.startsWith('bolt://') && !uri.startsWith('neo4j+s://') && !uri.startsWith('bolt+s://')) {
      const response: ConnectionTestResponse = {
        success: false,
        message: 'Invalid Neo4j URI format',
        error: 'URI must start with neo4j://, bolt://, neo4j+s://, or bolt+s://'
      }
      return NextResponse.json(response, { status: 400 })
    }

    try {
      // Import neo4j-driver
      const neo4j = require('neo4j-driver')
      console.log('Neo4j driver loaded successfully')
      
      // Create driver with more robust configuration
      const driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
        connectionTimeout: 10000, // 10 seconds
        maxConnectionLifetime: 30000, // 30 seconds
        maxConnectionPoolSize: 1, // Limit pool size for testing
        connectionAcquisitionTimeout: 10000, // 10 seconds
        disableLosslessIntegers: true, // Simplify integer handling
      })

      console.log('Neo4j driver created, testing connection...')

      // Test the connection with a session
      const session = driver.session()
      
      try {
        console.log('Running test query...')
        
        // Run a simple query to test connectivity
        const result = await session.run('RETURN 1 as test, "Hello Neo4j" as message')
        
        console.log('Query executed, processing results...')
        console.log('Result summary:', result.summary)
        console.log('Records count:', result.records.length)
        
        if (result.records.length === 0) {
          console.error('No records returned from test query')
          const response: ConnectionTestResponse = {
            success: false,
            message: 'Connection test failed',
            error: 'No records returned from test query'
          }
          return NextResponse.json(response)
        }

        const record = result.records[0]
        console.log('First record:', record)
        
        // Get values using different methods to ensure compatibility
        let testValue
        let messageValue
        
        try {
          testValue = record.get('test')
          messageValue = record.get('message')
          console.log('Retrieved values - test:', testValue, 'message:', messageValue)
        } catch (getError) {
          console.error('Error getting values from record:', getError)
          // Try alternative method
          try {
            testValue = record.get(0) // Get by index
            messageValue = record.get(1)
            console.log('Retrieved values by index - test:', testValue, 'message:', messageValue)
          } catch (indexError) {
            console.error('Error getting values by index:', indexError)
            throw new Error('Unable to retrieve values from query result')
          }
        }

        // Convert Neo4j Integer to JavaScript number if needed
        const testNumber = typeof testValue === 'object' && testValue.toNumber ? testValue.toNumber() : testValue

        console.log('Final test value:', testNumber, 'type:', typeof testNumber)

        if (testNumber === 1) {
          console.log('Connection test successful!')
          const response: ConnectionTestResponse = {
            success: true,
            message: 'Connection successful! Neo4j database is reachable and responding correctly.'
          }
          return NextResponse.json(response)
        } else {
          console.error('Unexpected test value:', testNumber)
          const response: ConnectionTestResponse = {
            success: false,
            message: 'Connection test failed',
            error: `Unexpected response from database. Expected 1, got: ${testNumber}`
          }
          return NextResponse.json(response)
        }
      } finally {
        console.log('Closing session and driver...')
        await session.close()
        await driver.close()
        console.log('Session and driver closed')
      }
    } catch (error) {
      console.error('Neo4j connection test failed:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      
      let errorMessage = 'Connection failed'
      let errorDetail = 'Unknown error'

      if (error instanceof Error) {
        errorDetail = error.message
        console.log('Error message:', errorDetail)
        
        // Provide more specific error messages based on common Neo4j errors
        if (errorDetail.includes('authentication') || errorDetail.includes('credentials')) {
          errorMessage = 'Authentication failed'
          errorDetail = 'Invalid username or password'
        } else if (errorDetail.includes('connection') || errorDetail.includes('connect')) {
          errorMessage = 'Connection failed'
          errorDetail = 'Unable to connect to Neo4j database. Check URI and network connectivity.'
        } else if (errorDetail.includes('timeout')) {
          errorMessage = 'Connection timeout'
          errorDetail = 'Database did not respond within the timeout period'
        } else if (errorDetail.includes('ENOTFOUND') || errorDetail.includes('ECONNREFUSED')) {
          errorMessage = 'Database unreachable'
          errorDetail = 'Cannot reach the database server. Check the URI and ensure Neo4j is running.'
        } else if (errorDetail.includes('ServiceUnavailable')) {
          errorMessage = 'Service unavailable'
          errorDetail = 'Neo4j service is not available. Check if the database is running and accessible.'
        } else if (errorDetail.includes('Neo.ClientError.Security.Unauthorized')) {
          errorMessage = 'Authentication failed'
          errorDetail = 'Invalid username or password'
        }
      }

      const response: ConnectionTestResponse = {
        success: false,
        message: errorMessage,
        error: errorDetail
      }
      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('Error in connection test API:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    const response: ConnectionTestResponse = {
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
    return NextResponse.json(response, { status: 500 })
  }
} 