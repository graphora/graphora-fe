'use client'

import { useEffect, useRef, useState } from 'react'
import { useGraphEditorStore, Relationship } from '@/lib/store/graph-editor-store'
import { Point } from '@/lib/utils/point'
import { Vector } from '@/lib/utils/vector'
import { NodeEditor } from './node-editor'
import { RelationshipEditor } from './relationship-editor'

interface GraphDisplayProps {
  className?: string
}

export function GraphDisplay({ className = '' }: GraphDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    graph,
    selection,
    viewTransformation,
    canvasSize,
    setCanvasSize,
    selectNode,
    selectRelationship,
    clearSelection,
    setViewTransformation,
    addNode,
    deleteSelection,
    duplicateSelection
  } = useGraphEditorStore()

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [initialTranslate, setInitialTranslate] = useState<Vector | null>(null)
  
  // State for editors
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null)

  // Resize observer to keep canvas size in sync with container
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setCanvasSize({ width, height })
      }
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [setCanvasSize])

  // Fix canvas resolution for high DPI displays
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Get the device pixel ratio
    const dpr = window.devicePixelRatio || 1

    // Set the canvas dimensions accounting for the device pixel ratio
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr

    // Scale the context to account for the device pixel ratio
    ctx.scale(dpr, dpr)

    // Set the CSS dimensions to the logical size
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
  }, [canvasSize])

  // Draw the graph whenever it changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Debug: Log the graph data
    console.log('Drawing graph:', graph)
    console.log('Nodes:', Object.keys(graph.nodes).length)
    console.log('Relationships:', Object.keys(graph.relationships).length)
    
    // Log each relationship for debugging
    Object.values(graph.relationships).forEach(rel => {
      const fromNode = graph.nodes[rel.from]
      const toNode = graph.nodes[rel.to]
      console.log(`Relationship ${rel.id}: ${rel.type} from ${fromNode?.caption || 'unknown'} to ${toNode?.caption || 'unknown'}`)
    })

    // Clear the canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    // Set the background color
    ctx.fillStyle = graph.style['background-color'] || '#f5f5f5'
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    // Draw grid (similar to arrows_app)
    const gridSize = 20
    const gridColor = '#e5e5e5'
    
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 0.5
    
    // Apply view transformation
    ctx.save()
    ctx.translate(viewTransformation.translate.dx, viewTransformation.translate.dy)
    ctx.scale(viewTransformation.scale, viewTransformation.scale)
    
    // Draw grid
    const startX = Math.floor(-viewTransformation.translate.dx / viewTransformation.scale / gridSize) * gridSize - gridSize
    const startY = Math.floor(-viewTransformation.translate.dy / viewTransformation.scale / gridSize) * gridSize - gridSize
    const endX = Math.ceil((canvasSize.width - viewTransformation.translate.dx) / viewTransformation.scale / gridSize) * gridSize + gridSize
    const endY = Math.ceil((canvasSize.height - viewTransformation.translate.dy) / viewTransformation.scale / gridSize) * gridSize + gridSize
    
    // Draw vertical grid lines
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, startY)
      ctx.lineTo(x, endY)
      ctx.stroke()
    }
    
    // Draw horizontal grid lines
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
      ctx.stroke()
    }

    // Enable text anti-aliasing
    ctx.textRendering = 'optimizeLegibility'
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Draw relationships
    console.log('Drawing relationships:', Object.values(graph.relationships).length)
    
    // Draw each relationship individually for debugging
    Object.values(graph.relationships).forEach(relationship => {
      const fromNode = graph.nodes[relationship.from]
      const toNode = graph.nodes[relationship.to]
      
      if (!fromNode || !toNode) {
        console.warn('Missing node for relationship:', relationship, 
                    'fromNode:', fromNode ? 'exists' : 'missing', 
                    'toNode:', toNode ? 'exists' : 'missing')
        return
      }
      
      console.log(`Drawing relationship: ${relationship.id} from ${fromNode.caption} to ${toNode.caption}`)
      
      const isSelected = selection.relationships.includes(relationship.id)
      
      // Calculate the direction vector
      const direction = fromNode.position.vectorTo(toNode.position)
      const length = direction.magnitude()
      const normalized = direction.scale(1 / length)
      
      // Calculate start and end points (adjusted for node radius)
      const nodeRadius = graph.style['node-radius'] || 30
      const startPoint = fromNode.position.translate(normalized.scale(nodeRadius))
      const endPoint = toNode.position.translate(normalized.scale(-nodeRadius))
      
      // Draw the relationship line
      ctx.beginPath()
      ctx.moveTo(startPoint.x, startPoint.y)
      ctx.lineTo(endPoint.x, endPoint.y)
      ctx.strokeStyle = isSelected ? '#ff0000' : (relationship.style['relationship-color'] || '#2d3748')
      ctx.lineWidth = relationship.style['shaft-width'] || 2
      if (isSelected) {
        ctx.lineWidth += 1
      }
      ctx.stroke()
      
      // Draw the arrow
      const arrowSize = relationship.style['arrow-size'] || 10
      const arrowAngle = Math.PI / 6 // 30 degrees
      
      const arrowPoint1 = endPoint.translate(
        normalized.scale(-arrowSize).add(normalized.perpendicular().scale(arrowSize * Math.sin(arrowAngle)))
      )
      const arrowPoint2 = endPoint.translate(
        normalized.scale(-arrowSize).add(normalized.perpendicular().scale(-arrowSize * Math.sin(arrowAngle)))
      )
      
      ctx.beginPath()
      ctx.moveTo(endPoint.x, endPoint.y)
      ctx.lineTo(arrowPoint1.x, arrowPoint1.y)
      ctx.lineTo(arrowPoint2.x, arrowPoint2.y)
      ctx.closePath()
      ctx.fillStyle = isSelected ? '#ff0000' : (relationship.style['relationship-color'] || '#2d3748')
      ctx.fill()
      
      // Draw the relationship type
      if (relationship.type) {
        const midPoint = new Point(
          (startPoint.x + endPoint.x) / 2,
          (startPoint.y + endPoint.y) / 2
        )
        
        // Use a larger font size for better readability
        const fontSize = Math.max(14, graph.style['font-size'] || 12)
        ctx.font = `bold ${fontSize}px ${graph.style['font-family'] || 'Arial, sans-serif'}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // Draw a white background for the text
        const textMetrics = ctx.measureText(relationship.type)
        const padding = 6
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(
          midPoint.x - textMetrics.width / 2 - padding,
          midPoint.y - fontSize / 2 - padding,
          textMetrics.width + padding * 2,
          fontSize + padding * 2
        )
        
        // Draw a border around the text
        ctx.strokeStyle = '#e2e8f0'
        ctx.lineWidth = 1
        ctx.strokeRect(
          midPoint.x - textMetrics.width / 2 - padding,
          midPoint.y - fontSize / 2 - padding,
          textMetrics.width + padding * 2,
          fontSize + padding * 2
        )
        
        ctx.fillStyle = '#000000' // Use black for better readability
        ctx.fillText(relationship.type, midPoint.x, midPoint.y)
      }
    })

    // Draw nodes
    Object.values(graph.nodes).forEach(node => {
      const isSelected = selection.nodes.includes(node.id)
      const nodeRadius = graph.style['node-radius'] || 30

      // Draw shadow (like arrows_app)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
      ctx.shadowBlur = 5
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2

      // Draw the node circle
      ctx.beginPath()
      ctx.arc(node.position.x, node.position.y, nodeRadius, 0, Math.PI * 2)
      ctx.fillStyle = node.style['node-color'] || '#4299e1'
      ctx.fill()

      // Reset shadow
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      // Draw the node border
      if (isSelected) {
        ctx.strokeStyle = '#ff0000'
        ctx.lineWidth = (node.style['border-width'] || 2) + 1
      } else {
        ctx.strokeStyle = node.style['border-color'] || '#2b6cb0'
        ctx.lineWidth = node.style['border-width'] || 2
      }
      ctx.stroke()

      // Draw the node caption
      if (node.caption) {
        // Use a larger font size for better readability
        const fontSize = Math.max(14, graph.style['font-size'] || 12)
        ctx.font = `bold ${fontSize}px ${graph.style['font-family'] || 'Arial, sans-serif'}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ffffff'
        
        // Truncate text to fit within the node
        const maxWidth = nodeRadius * 1.8
        let displayText = node.caption
        
        // Measure text width
        const textWidth = ctx.measureText(displayText).width
        
        // If text is too wide, truncate it
        if (textWidth > maxWidth) {
          // Try to find a good truncation point
          let truncated = false
          
          // First try: if text has spaces, try to break at a word boundary
          if (displayText.includes(' ')) {
            const words = displayText.split(' ')
            let currentText = words[0]
            
            for (let i = 1; i < words.length; i++) {
              const testText = currentText + ' ' + words[i]
              if (ctx.measureText(testText).width <= maxWidth) {
                currentText = testText
              } else {
                displayText = currentText
                truncated = true
                break
              }
            }
          }
          
          // Second try: if still too long or no spaces, truncate with ellipsis
          if (!truncated || ctx.measureText(displayText).width > maxWidth) {
            let ellipsis = '...'
            let textLength = displayText.length
            
            while (textLength > 0) {
              const truncatedText = displayText.substring(0, textLength) + ellipsis
              if (ctx.measureText(truncatedText).width <= maxWidth) {
                displayText = truncatedText
                break
              }
              textLength--
            }
          }
        }
        
        ctx.fillText(displayText, node.position.x, node.position.y)
      }

      // Draw node properties (like arrows_app)
      if (Object.keys(node.properties).length > 0) {
        const propertyKeys = Object.keys(node.properties)
        const displayCount = Math.min(propertyKeys.length, 2) // Show at most 2 properties
        
        if (displayCount > 0) {
          const propertyY = node.position.y + nodeRadius + 5
          
          // Use a slightly larger font for properties
          const propFontSize = Math.max(12, (graph.style['font-size'] || 12) - 2)
          ctx.font = `${propFontSize}px ${graph.style['font-family'] || 'Arial, sans-serif'}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = '#000000' // Use black for better readability
          
          // Draw white background for property text
          for (let i = 0; i < displayCount; i++) {
            const propKey = propertyKeys[i]
            const propValue = node.properties[propKey]
            const propText = `${propKey}: ${propValue}`
            const textMetrics = ctx.measureText(propText)
            const padding = 4
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
            ctx.fillRect(
              node.position.x - textMetrics.width / 2 - padding,
              propertyY + i * (propFontSize + 4) - 2,
              textMetrics.width + padding * 2,
              propFontSize + 4
            )
          }
          
          // Draw property text
          ctx.fillStyle = '#000000'
          for (let i = 0; i < displayCount; i++) {
            const propKey = propertyKeys[i]
            const propValue = node.properties[propKey]
            ctx.fillText(`${propKey}: ${propValue}`, node.position.x, propertyY + i * (propFontSize + 4))
          }
          
          // Show count of additional properties
          if (propertyKeys.length > 2) {
            const moreText = `+${propertyKeys.length - 2} more`
            const textMetrics = ctx.measureText(moreText)
            const padding = 4
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
            ctx.fillRect(
              node.position.x - textMetrics.width / 2 - padding,
              propertyY + displayCount * (propFontSize + 4) - 2,
              textMetrics.width + padding * 2,
              propFontSize + 4
            )
            
            ctx.fillStyle = '#000000'
            ctx.fillText(moreText, node.position.x, propertyY + displayCount * (propFontSize + 4))
          }
        }
      }
    })

    ctx.restore()
  }, [graph, selection, viewTransformation, canvasSize])

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const point = new Point(x, y)

    // Transform the point to graph coordinates
    const graphPoint = new Point(
      (point.x - viewTransformation.translate.dx) / viewTransformation.scale,
      (point.y - viewTransformation.translate.dy) / viewTransformation.scale
    )

    setIsDragging(true)
    setDragStart(point)
    setInitialTranslate(viewTransformation.translate)

    // Check if we clicked on a node
    const nodeRadius = graph.style['node-radius'] || 25
    let clickedOnNode = false

    for (const node of Object.values(graph.nodes)) {
      if (node.position.distanceTo(graphPoint) <= nodeRadius) {
        // If holding Ctrl/Cmd, toggle selection
        if (e.ctrlKey || e.metaKey) {
          selectNode(node.id, true)
        } else {
          selectNode(node.id)
        }
        setDraggedNode(node.id)
        clickedOnNode = true
        break
      }
    }

    // If we didn't click on a node, check if we clicked on a relationship
    if (!clickedOnNode) {
      const threshold = 5 // Distance threshold for clicking on a relationship
      let clickedOnRelationship = false

      for (const relationship of Object.values(graph.relationships)) {
        const fromNode = graph.nodes[relationship.from]
        const toNode = graph.nodes[relationship.to]

        if (!fromNode || !toNode) continue

        // Calculate the direction vector
        const direction = fromNode.position.vectorTo(toNode.position)
        const length = direction.magnitude()
        const normalized = direction.scale(1 / length)

        // Calculate start and end points (adjusted for node radius)
        const nodeRadius = graph.style['node-radius'] || 25
        const startPoint = fromNode.position.translate(normalized.scale(nodeRadius))
        const endPoint = toNode.position.translate(normalized.scale(-nodeRadius))

        // Calculate distance from point to line segment
        const lineVector = startPoint.vectorTo(endPoint)
        const pointVector = startPoint.vectorTo(graphPoint)

        const lineLength = lineVector.magnitude()
        const projection = (pointVector.dx * lineVector.dx + pointVector.dy * lineVector.dy) / lineLength

        if (projection < 0 || projection > lineLength) continue

        const projectionPoint = startPoint.translate(lineVector.scale(projection / lineLength))
        const distance = graphPoint.distanceTo(projectionPoint)

        if (distance <= threshold) {
          // If holding Ctrl/Cmd, toggle selection
          if (e.ctrlKey || e.metaKey) {
            selectRelationship(relationship.id, true)
          } else {
            selectRelationship(relationship.id)
          }
          clickedOnRelationship = true
          break
        }
      }

      // If we didn't click on a node or relationship, clear the selection
      if (!clickedOnRelationship && !e.ctrlKey && !e.metaKey) {
        clearSelection()
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const point = new Point(x, y)

    if (draggedNode) {
      // Move the selected nodes
      const dx = (point.x - dragStart.x) / viewTransformation.scale
      const dy = (point.y - dragStart.y) / viewTransformation.scale

      // Update the position of all selected nodes
      selection.nodes.forEach(nodeId => {
        const node = graph.nodes[nodeId]
        if (node) {
          const newPosition = new Point(
            node.position.x + dx,
            node.position.y + dy
          )
          useGraphEditorStore.getState().updateNode(nodeId, { position: newPosition })
        }
      })

      setDragStart(point)
    } else if (initialTranslate) {
      // Pan the view
      const dx = point.x - dragStart.x
      const dy = point.y - dragStart.y
      const newTranslate = new Vector(
        initialTranslate.dx + dx,
        initialTranslate.dy + dy
      )
      setViewTransformation({ translate: newTranslate })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
    setDraggedNode(null)
    setInitialTranslate(null)
  }

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const point = new Point(x, y)

    // Transform the point to graph coordinates
    const graphPoint = new Point(
      (point.x - viewTransformation.translate.dx) / viewTransformation.scale,
      (point.y - viewTransformation.translate.dy) / viewTransformation.scale
    )

    // Check if we double-clicked on a node
    const nodeRadius = graph.style['node-radius'] || 25
    let clickedOnNode = false

    for (const node of Object.values(graph.nodes)) {
      if (node.position.distanceTo(graphPoint) <= nodeRadius) {
        // Open the node editor
        setEditingNodeId(node.id)
        clickedOnNode = true
        break
      }
    }

    // If we didn't double-click on a node, check if we double-clicked on a relationship
    if (!clickedOnNode) {
      const threshold = 5 // Distance threshold for clicking on a relationship
      
      for (const relationship of Object.values(graph.relationships)) {
        const fromNode = graph.nodes[relationship.from]
        const toNode = graph.nodes[relationship.to]

        if (!fromNode || !toNode) continue

        // Calculate the direction vector
        const direction = fromNode.position.vectorTo(toNode.position)
        const length = direction.magnitude()
        const normalized = direction.scale(1 / length)

        // Calculate start and end points (adjusted for node radius)
        const nodeRadius = graph.style['node-radius'] || 25
        const startPoint = fromNode.position.translate(normalized.scale(nodeRadius))
        const endPoint = toNode.position.translate(normalized.scale(-nodeRadius))

        // Calculate distance from point to line segment
        const lineVector = startPoint.vectorTo(endPoint)
        const pointVector = startPoint.vectorTo(graphPoint)

        const lineLength = lineVector.magnitude()
        const projection = (pointVector.dx * lineVector.dx + pointVector.dy * lineVector.dy) / lineLength

        if (projection < 0 || projection > lineLength) continue

        const projectionPoint = startPoint.translate(lineVector.scale(projection / lineLength))
        const distance = graphPoint.distanceTo(projectionPoint)

        if (distance <= threshold) {
          // Open the relationship editor
          setEditingRelationshipId(relationship.id)
          return
        }
      }

      // If we didn't double-click on a node or relationship, add a new node
      addNode(graphPoint, 'New Entity')
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const point = new Point(x, y)

    // Calculate the point in graph coordinates before scaling
    const graphPointBefore = new Point(
      (point.x - viewTransformation.translate.dx) / viewTransformation.scale,
      (point.y - viewTransformation.translate.dy) / viewTransformation.scale
    )

    // Update the scale
    const delta = e.deltaY < 0 ? 1.1 : 0.9
    const newScale = viewTransformation.scale * delta

    // Calculate the point in graph coordinates after scaling
    const graphPointAfter = new Point(
      (point.x - viewTransformation.translate.dx) / newScale,
      (point.y - viewTransformation.translate.dy) / newScale
    )

    // Calculate the translation needed to keep the point under the cursor
    const dx = (graphPointAfter.x - graphPointBefore.x) * newScale
    const dy = (graphPointAfter.y - graphPointBefore.y) * newScale

    // Update the view transformation
    setViewTransformation({
      scale: newScale,
      translate: new Vector(
        viewTransformation.translate.dx - dx,
        viewTransformation.translate.dy - dy
      )
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    // Delete key
    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelection()
    }

    // Duplicate (Ctrl+D or Cmd+D)
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault()
      duplicateSelection()
    }

    // Edit (Enter)
    if (e.key === 'Enter') {
      if (selection.nodes.length === 1) {
        setEditingNodeId(selection.nodes[0])
      } else if (selection.relationships.length === 1) {
        setEditingRelationshipId(selection.relationships[0])
      }
    }
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        width={canvasSize.width}
        height={canvasSize.height}
      />
      
      {/* Node Editor */}
      <NodeEditor 
        nodeId={editingNodeId} 
        onClose={() => setEditingNodeId(null)} 
      />
      
      {/* Relationship Editor */}
      <RelationshipEditor 
        relationshipId={editingRelationshipId} 
        onClose={() => setEditingRelationshipId(null)} 
      />
    </div>
  )
} 