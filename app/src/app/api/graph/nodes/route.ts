import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// In-memory store for development
let nodes = new Map()

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type, properties } = body

    if (!type) {
      return NextResponse.json({ error: 'Node type is required' }, { status: 400 })
    }

    const nodeId = `${type}_${Date.now()}`
    const node = {
      id: nodeId,
      type,
      properties: properties || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    nodes.set(nodeId, node)

    return NextResponse.json(node)
  } catch (error) {
    console.error('Error creating node:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const nodeId = req.nextUrl.searchParams.get('nodeId')
    if (!nodeId) {
      return NextResponse.json({ error: 'Node ID is required' }, { status: 400 })
    }

    const node = nodes.get(nodeId)
    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }

    const { properties } = await req.json()
    
    const updatedNode = {
      ...node,
      properties: { ...node.properties, ...properties },
      updatedAt: new Date().toISOString()
    }

    nodes.set(nodeId, updatedNode)

    return NextResponse.json(updatedNode)
  } catch (error) {
    console.error('Error updating node:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const nodeId = req.nextUrl.searchParams.get('nodeId')
    if (!nodeId) {
      return NextResponse.json({ error: 'Node ID is required' }, { status: 400 })
    }

    if (!nodes.has(nodeId)) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }

    nodes.delete(nodeId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting node:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 