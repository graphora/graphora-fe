import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ConfigRequest, ConfigResponse } from '@/types/config'
import { getUserEmailOrThrow } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userEmail = await getUserEmailOrThrow()

    // Check if BACKEND_API_URL is configured
    if (!process.env.BACKEND_API_URL) {
      console.error('BACKEND_API_URL environment variable is not set')
      return NextResponse.json({ 
        success: false, 
        error: 'Backend API URL not configured. Please check your environment variables.' 
      }, { status: 500 })
    }

    // Fetch configuration from backend
    const backendUrl = `${process.env.BACKEND_API_URL}/api/v1/config?email=${encodeURIComponent(userEmail)}`
    console.log('Fetching config from:', backendUrl)
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.status === 404) {
      // No configuration found
      return NextResponse.json({ success: true, config: null })
    }

    if (!response.ok) {
      console.error('Backend API error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Backend error response:', errorText)
      
      // Try to parse as JSON, fallback to text
      let errorMessage = 'Failed to fetch configuration'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      
      return NextResponse.json({ 
        success: false, 
        error: `Backend error: ${errorMessage}` 
      }, { status: response.status })
    }

    const config = await response.json()
    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('Error fetching configuration:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Internal server error'
    if (error instanceof Error) {
      if (error.message.includes('CLERK_SECRET_KEY')) {
        errorMessage = 'Authentication configuration error. Please contact support.'
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to backend service. Please try again later.'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userEmail = await getUserEmailOrThrow()
    const body: ConfigRequest = await request.json()
    
    // Validate required fields
    if (!body.stagingDb || !body.prodDb) {
      return NextResponse.json({ success: false, error: 'Both staging and production database configurations are required' }, { status: 400 })
    }

    // Validate Neo4j specific fields
    const validateNeo4jConfig = (db: any, dbType: string) => {
      if (!db.name || !db.uri || !db.username || !db.password) {
        return `${dbType} database is missing required fields (name, uri, username, password)`
      }
      
      const validUriPrefixes = ['neo4j://', 'bolt://', 'neo4j+s://', 'bolt+s://']
      if (!validUriPrefixes.some(prefix => db.uri.startsWith(prefix))) {
        return `${dbType} database URI must start with neo4j://, bolt://, neo4j+s://, or bolt+s://`
      }
      
      return null
    }

    const stagingError = validateNeo4jConfig(body.stagingDb, 'Staging')
    if (stagingError) {
      return NextResponse.json({ success: false, error: stagingError }, { status: 400 })
    }

    const prodError = validateNeo4jConfig(body.prodDb, 'Production')
    if (prodError) {
      return NextResponse.json({ success: false, error: prodError }, { status: 400 })
    }

    // Validate that staging and prod DBs are different
    if (body.stagingDb.uri === body.prodDb.uri) {
      return NextResponse.json({ success: false, error: 'Staging and production database URIs must be different' }, { status: 400 })
    }

    // Check if BACKEND_API_URL is configured
    if (!process.env.BACKEND_API_URL) {
      return NextResponse.json({ 
        success: false, 
        error: 'Backend API URL not configured. Please check your environment variables.' 
      }, { status: 500 })
    }

    // Send configuration to backend
    const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail,
        stagingDb: body.stagingDb,
        prodDb: body.prodDb,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend error response:', errorText)
      
      let errorMessage = 'Failed to save configuration'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      
      return NextResponse.json({ 
        success: false, 
        error: `Backend error: ${errorMessage}` 
      }, { status: response.status })
    }

    const config = await response.json()
    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('Error saving configuration:', error)
    
    let errorMessage = 'Internal server error'
    if (error instanceof Error) {
      if (error.message.includes('CLERK_SECRET_KEY')) {
        errorMessage = 'Authentication configuration error. Please contact support.'
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to backend service. Please try again later.'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userEmail = await getUserEmailOrThrow()
    const body: ConfigRequest = await request.json()
    
    // Validate required fields
    if (!body.stagingDb || !body.prodDb) {
      return NextResponse.json({ success: false, error: 'Both staging and production database configurations are required' }, { status: 400 })
    }

    // Validate Neo4j specific fields
    const validateNeo4jConfig = (db: any, dbType: string) => {
      if (!db.name || !db.uri || !db.username || !db.password) {
        return `${dbType} database is missing required fields (name, uri, username, password)`
      }
      
      const validUriPrefixes = ['neo4j://', 'bolt://', 'neo4j+s://', 'bolt+s://']
      if (!validUriPrefixes.some(prefix => db.uri.startsWith(prefix))) {
        return `${dbType} database URI must start with neo4j://, bolt://, neo4j+s://, or bolt+s://`
      }
      
      return null
    }

    const stagingError = validateNeo4jConfig(body.stagingDb, 'Staging')
    if (stagingError) {
      return NextResponse.json({ success: false, error: stagingError }, { status: 400 })
    }

    const prodError = validateNeo4jConfig(body.prodDb, 'Production')
    if (prodError) {
      return NextResponse.json({ success: false, error: prodError }, { status: 400 })
    }

    // Validate that staging and prod DBs are different
    if (body.stagingDb.uri === body.prodDb.uri) {
      return NextResponse.json({ success: false, error: 'Staging and production database URIs must be different' }, { status: 400 })
    }

    // Check if BACKEND_API_URL is configured
    if (!process.env.BACKEND_API_URL) {
      return NextResponse.json({ 
        success: false, 
        error: 'Backend API URL not configured. Please check your environment variables.' 
      }, { status: 500 })
    }

    // Update configuration in backend
    const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail,
        stagingDb: body.stagingDb,
        prodDb: body.prodDb,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend error response:', errorText)
      
      let errorMessage = 'Failed to update configuration'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      
      return NextResponse.json({ 
        success: false, 
        error: `Backend error: ${errorMessage}` 
      }, { status: response.status })
    }

    const config = await response.json()
    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('Error updating configuration:', error)
    
    let errorMessage = 'Internal server error'
    if (error instanceof Error) {
      if (error.message.includes('CLERK_SECRET_KEY')) {
        errorMessage = 'Authentication configuration error. Please contact support.'
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to backend service. Please try again later.'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 })
  }
} 