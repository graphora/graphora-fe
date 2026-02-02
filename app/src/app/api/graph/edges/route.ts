import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/server-auth'

// In-memory store for development
let edges = new Map()

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getServerAuth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { sourceId, targetId, type, properties } = body

    if (!sourceId || !targetId || !type) {
      return NextResponse.json({ error: 'Source ID, target ID, and type are required' }, { status: 400 })
    }

    const edgeId = `${type}_${sourceId}_${targetId}_${Date.now()}`
    const edge = {
      id: edgeId,
      sourceId,
      targetId,
      type,
      properties: properties || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    edges.set(edgeId, edge)

    return NextResponse.json(edge)
  } catch (error) {
    console.error('Error creating edge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await getServerAuth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const edgeId = req.nextUrl.searchParams.get('edgeId')
    if (!edgeId) {
      return NextResponse.json({ error: 'Edge ID is required' }, { status: 400 })
    }

    const edge = edges.get(edgeId)
    if (!edge) {
      return NextResponse.json({ error: 'Edge not found' }, { status: 404 })
    }

    const { properties } = await req.json()
    
    const updatedEdge = {
      ...edge,
      properties: { ...edge.properties, ...properties },
      updatedAt: new Date().toISOString()
    }

    edges.set(edgeId, updatedEdge)

    return NextResponse.json(updatedEdge)
  } catch (error) {
    console.error('Error updating edge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await getServerAuth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const edgeId = req.nextUrl.searchParams.get('edgeId')
    if (!edgeId) {
      return NextResponse.json({ error: 'Edge ID is required' }, { status: 400 })
    }

    if (!edges.has(edgeId)) {
      return NextResponse.json({ error: 'Edge not found' }, { status: 404 })
    }

    edges.delete(edgeId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting edge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 