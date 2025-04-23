'use client'

import { useEffect, useRef, useState } from 'react'
import { useGraphEditorStore, PropertyDefinition } from '@/lib/store/graph-editor-store'
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
    duplicateSelection,
    addRelationship,
    updateNode
  } = useGraphEditorStore()

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [initialTranslate, setInitialTranslate] = useState<Vector | null>(null)
  
  // State for editors
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null)
  
  // State for relationship creation
  const [isCreatingRelationship, setIsCreatingRelationship] = useState(false)
  const [relationshipStartNode, setRelationshipStartNode] = useState<string | null>(null)
  const [relationshipEndPoint, setRelationshipEndPoint] = useState<Point | null>(null)

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
    
    // Create a map to track multiple relationships between the same nodes
    // Use directional keys to distinguish relationships in different directions
    const relationshipCounts: Record<string, number> = {}
    const relationshipIndices: Record<string, number> = {}
    
    // First pass: count relationships between each pair of nodes
    Object.values(graph.relationships).forEach((relationship) => {
      const fromNode = graph.nodes[relationship.from]
      const toNode = graph.nodes[relationship.to]
      if (!fromNode || !toNode) return
      
      // Create a directional key (from -> to)
      const dirKey = `${relationship.from}->${relationship.to}`
      relationshipCounts[dirKey] = (relationshipCounts[dirKey] || 0) + 1
    })
    
    // Second pass: draw relationships with appropriate offsets
    Object.values(graph.relationships).forEach((relationship) => {
      const fromNode = graph.nodes[relationship.from]
      const toNode = graph.nodes[relationship.to]
      if (!fromNode || !toNode) return
      
      // Create a directional key (from -> to)
      const dirKey = `${relationship.from}->${relationship.to}`
      
      // Assign an index to this relationship
      relationshipIndices[dirKey] = (relationshipIndices[dirKey] || 0) + 1
      const index = relationshipIndices[dirKey]
      const count = relationshipCounts[dirKey]
      
      // Calculate offset based on index and count
      let offset = 0
      if (count > 1) {
        // Calculate offset perpendicular to the relationship line
        const totalWidth = 30 // Total width of offset area
        const step = totalWidth / (count - 1)
        offset = -totalWidth / 2 + step * (index - 1)
      }
      
      // Check if there are relationships in the opposite direction
      const reverseKey = `${relationship.to}->${relationship.from}`
      const hasReverseRelationships = relationshipCounts[reverseKey] > 0
      
      // Add a curve to the line if there are relationships in both directions
      const curveOffset = hasReverseRelationships ? 20 : 0
      
      // Calculate direction vector
      const directionVector = new Vector(
        toNode.position.x - fromNode.position.x,
        toNode.position.y - fromNode.position.y
      )
      
      // Normalize direction vector
      const length = directionVector.magnitude()
      const normalizedVector = directionVector.normalize()
      
      // Calculate perpendicular vector for offset
      const perpendicularVector = normalizedVector.perpendicular()
      
      // Calculate start and end points with offset
      const nodeRadius = graph.style['node-radius'] || 40
      
      // Apply offset and node radius to start and end points
      const offsetVector = perpendicularVector.scale(offset)
      const radiusVector = normalizedVector.scale(nodeRadius)
      
      // Add curve offset if needed
      const curveOffsetVector = perpendicularVector.scale(curveOffset)
      
      const startX = fromNode.position.x + offsetVector.dx + radiusVector.dx
      const startY = fromNode.position.y + offsetVector.dy + radiusVector.dy
      const endX = toNode.position.x + offsetVector.dx - radiusVector.dx
      const endY = toNode.position.y + offsetVector.dy - radiusVector.dy
      
      const startPoint = new Point(startX, startY)
      const endPoint = new Point(endX, endY)
      
      // Set relationship style
      ctx.strokeStyle = relationship.style['stroke'] || '#888'
      ctx.lineWidth = relationship.style['stroke-width'] || 2
      
      // Draw the relationship line
      ctx.beginPath()
      
      if (curveOffset !== 0) {
        // Draw a curved line for bidirectional relationships
        const controlPoint1X = startPoint.x + (endPoint.x - startPoint.x) / 3 + curveOffsetVector.dx
        const controlPoint1Y = startPoint.y + (endPoint.y - startPoint.y) / 3 + curveOffsetVector.dy
        const controlPoint2X = startPoint.x + 2 * (endPoint.x - startPoint.x) / 3 + curveOffsetVector.dx
        const controlPoint2Y = startPoint.y + 2 * (endPoint.y - startPoint.y) / 3 + curveOffsetVector.dy
        
        ctx.moveTo(startPoint.x, startPoint.y)
        ctx.bezierCurveTo(
          controlPoint1X, controlPoint1Y,
          controlPoint2X, controlPoint2Y,
          endPoint.x, endPoint.y
        )
      } else {
        // Draw a straight line for unidirectional relationships
        ctx.moveTo(startPoint.x, startPoint.y)
        ctx.lineTo(endPoint.x, endPoint.y)
      }
      
      ctx.stroke()
      
      // Draw arrow at the end
      const arrowSize = 10
      const arrowAngle = Math.PI / 6 // 30 degrees
      
      // For curved lines, calculate the tangent at the end point
      let endTangentX, endTangentY
      
      if (curveOffset !== 0) {
        // For a bezier curve, the tangent at the end point is approximately
        // the vector from the last control point to the end point
        const controlPoint2X = startPoint.x + 2 * (endPoint.x - startPoint.x) / 3 + curveOffsetVector.dx
        const controlPoint2Y = startPoint.y + 2 * (endPoint.y - startPoint.y) / 3 + curveOffsetVector.dy
        
        const tangentVector = new Vector(
          endPoint.x - controlPoint2X,
          endPoint.y - controlPoint2Y
        ).normalize()
        
        endTangentX = tangentVector.dx
        endTangentY = tangentVector.dy
      } else {
        // For straight lines, use the normalized direction vector
        endTangentX = normalizedVector.dx
        endTangentY = normalizedVector.dy
      }
      
      // Calculate perpendicular vector to the tangent
      const endPerpX = -endTangentY
      const endPerpY = endTangentX
      
      // Calculate arrow points
      const arrowPoint1X = endPoint.x - endTangentX * arrowSize + 
                           endPerpX * arrowSize * Math.sin(arrowAngle)
      const arrowPoint1Y = endPoint.y - endTangentY * arrowSize + 
                           endPerpY * arrowSize * Math.sin(arrowAngle)
      
      const arrowPoint2X = endPoint.x - endTangentX * arrowSize - 
                           endPerpX * arrowSize * Math.sin(arrowAngle)
      const arrowPoint2Y = endPoint.y - endTangentY * arrowSize - 
                           endPerpY * arrowSize * Math.sin(arrowAngle)
      
      const arrowPoint1 = new Point(arrowPoint1X, arrowPoint1Y)
      const arrowPoint2 = new Point(arrowPoint2X, arrowPoint2Y)
      
      ctx.beginPath()
      ctx.moveTo(endPoint.x, endPoint.y)
      ctx.lineTo(arrowPoint1.x, arrowPoint1.y)
      ctx.lineTo(arrowPoint2.x, arrowPoint2.y)
      ctx.closePath()
      ctx.fillStyle = relationship.style['stroke'] || '#888'
      ctx.fill()
      
      // Draw relationship type in the middle
      if (relationship.type) {
        // Calculate the middle point of the line or curve
        let midX, midY
        
        if (curveOffset !== 0) {
          // For a bezier curve, the middle point is approximately at t=0.5
          const controlPoint1X = startPoint.x + (endPoint.x - startPoint.x) / 3 + curveOffsetVector.dx
          const controlPoint1Y = startPoint.y + (endPoint.y - startPoint.y) / 3 + curveOffsetVector.dy
          const controlPoint2X = startPoint.x + 2 * (endPoint.x - startPoint.x) / 3 + curveOffsetVector.dx
          const controlPoint2Y = startPoint.y + 2 * (endPoint.y - startPoint.y) / 3 + curveOffsetVector.dy
          
          // Bezier curve formula at t=0.5
          midX = 0.125 * startPoint.x + 0.375 * controlPoint1X + 0.375 * controlPoint2X + 0.125 * endPoint.x
          midY = 0.125 * startPoint.y + 0.375 * controlPoint1Y + 0.375 * controlPoint2Y + 0.125 * endPoint.y
        } else {
          midX = (startPoint.x + endPoint.x) / 2
          midY = (startPoint.y + endPoint.y) / 2
        }
        
        // Draw white background for better readability
        ctx.font = `${graph.style['font-size'] || 12}px ${graph.style['font-family'] || 'Arial, sans-serif'}`
        const textMetrics = ctx.measureText(relationship.type)
        const padding = 4
        
        ctx.fillStyle = 'white'
        ctx.fillRect(
          midX - textMetrics.width / 2 - padding,
          midY - textMetrics.actualBoundingBoxAscent - padding,
          textMetrics.width + padding * 2,
          textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent + padding * 2
        )
        
        ctx.fillStyle = '#000'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(relationship.type, midX, midY)
      }
      
      // Highlight selected relationships
      if (selection.relationships.includes(relationship.id)) {
        ctx.strokeStyle = '#3182ce' // Highlight color
        ctx.lineWidth = 4
        ctx.beginPath()
        
        if (curveOffset !== 0) {
          // Draw a curved line for bidirectional relationships
          const controlPoint1X = startPoint.x + (endPoint.x - startPoint.x) / 3 + curveOffsetVector.dx
          const controlPoint1Y = startPoint.y + (endPoint.y - startPoint.y) / 3 + curveOffsetVector.dy
          const controlPoint2X = startPoint.x + 2 * (endPoint.x - startPoint.x) / 3 + curveOffsetVector.dx
          const controlPoint2Y = startPoint.y + 2 * (endPoint.y - startPoint.y) / 3 + curveOffsetVector.dy
          
          ctx.moveTo(startPoint.x, startPoint.y)
          ctx.bezierCurveTo(
            controlPoint1X, controlPoint1Y,
            controlPoint2X, controlPoint2Y,
            endPoint.x, endPoint.y
          )
        } else {
          ctx.moveTo(startPoint.x, startPoint.y)
          ctx.lineTo(endPoint.x, endPoint.y)
        }
        
        ctx.stroke()
      }
    })

    // Draw nodes
    Object.values(graph.nodes).forEach(node => {
      const isSelected = selection.nodes.includes(node.id)
      const nodeRadius = graph.style['node-radius'] || 40

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

      // Draw relationship creation handle if node is selected
      if (isSelected && !isCreatingRelationship) {
        const handleRadius = 10
        const handleOffset = nodeRadius + 5
        
        // Handle is positioned on the right side of the node
        const handleX = node.position.x + handleOffset
        const handleY = node.position.y
        
        // Draw handle circle
        ctx.beginPath()
        ctx.arc(handleX, handleY, handleRadius, 0, Math.PI * 2)
        ctx.fillStyle = '#3182ce' // Blue color
        ctx.fill()
        ctx.strokeStyle = '#2c5282' // Darker blue
        ctx.lineWidth = 2
        ctx.stroke()
        
        // Draw plus sign
        ctx.beginPath()
        ctx.moveTo(handleX - 5, handleY)
        ctx.lineTo(handleX + 5, handleY)
        ctx.moveTo(handleX, handleY - 5)
        ctx.lineTo(handleX, handleY + 5)
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })

    // Draw relationship being created
    if (isCreatingRelationship && relationshipStartNode && relationshipEndPoint) {
      const startNode = graph.nodes[relationshipStartNode]
      if (startNode) {
        const nodeRadius = graph.style['node-radius'] || 40
        const handleOffset = nodeRadius + 5
        
        // Start point is the handle position
        const startX = startNode.position.x + handleOffset
        const startY = startNode.position.y
        
        // Draw dashed line
        ctx.beginPath()
        ctx.setLineDash([5, 3])
        ctx.moveTo(startX, startY)
        ctx.lineTo(relationshipEndPoint.x, relationshipEndPoint.y)
        ctx.strokeStyle = '#3182ce'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.setLineDash([])
        
        // Draw arrow at the end
        const directionVector = new Vector(
          relationshipEndPoint.x - startX,
          relationshipEndPoint.y - startY
        )
        
        if (directionVector.magnitude() > 0) {
          const normalizedVector = directionVector.normalize()
          const arrowSize = 10
          const arrowAngle = Math.PI / 6 // 30 degrees
          
          const perpendicularVector = normalizedVector.perpendicular()
          
          const arrowPoint1X = relationshipEndPoint.x - normalizedVector.dx * arrowSize + 
                              perpendicularVector.dx * arrowSize * Math.sin(arrowAngle)
          const arrowPoint1Y = relationshipEndPoint.y - normalizedVector.dy * arrowSize + 
                              perpendicularVector.dy * arrowSize * Math.sin(arrowAngle)
          
          const arrowPoint2X = relationshipEndPoint.x - normalizedVector.dx * arrowSize - 
                              perpendicularVector.dx * arrowSize * Math.sin(arrowAngle)
          const arrowPoint2Y = relationshipEndPoint.y - normalizedVector.dy * arrowSize - 
                              perpendicularVector.dy * arrowSize * Math.sin(arrowAngle)
          
          ctx.beginPath()
          ctx.moveTo(relationshipEndPoint.x, relationshipEndPoint.y)
          ctx.lineTo(arrowPoint1X, arrowPoint1Y)
          ctx.lineTo(arrowPoint2X, arrowPoint2Y)
          ctx.closePath()
          ctx.fillStyle = '#3182ce'
          ctx.fill()
        }
      }
    }

    ctx.restore()
  }, [graph, selection, viewTransformation, canvasSize, isCreatingRelationship, relationshipStartNode, relationshipEndPoint])

  // Helper function to check if a point is inside a relationship creation handle
  const isPointInRelationshipHandle = (point: Point, nodeId: string): boolean => {
    const node = graph.nodes[nodeId]
    if (!node) return false
    
    const nodeRadius = graph.style['node-radius'] || 40
    const handleRadius = 10
    const handleOffset = nodeRadius + 5
    
    // Handle is positioned on the right side of the node
    const handleX = node.position.x + handleOffset
    const handleY = node.position.y
    
    // Calculate distance from point to handle center
    const distance = Math.sqrt(
      Math.pow(point.x - handleX, 2) + 
      Math.pow(point.y - handleY, 2)
    )
    
    return distance <= handleRadius
  }

  // Handle mouse down event
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
    
    // Check if we clicked on a relationship handle
    if (selection.nodes.length === 1) {
      const selectedNodeId = selection.nodes[0]
      const selectedNode = graph.nodes[selectedNodeId]
      
      if (selectedNode && isPointInRelationshipHandle(graphPoint, selectedNodeId)) {
        console.log('Starting relationship creation')
        setIsCreatingRelationship(true)
        setRelationshipStartNode(selectedNodeId)
        setRelationshipEndPoint(graphPoint)
        return
      }
    }
    
    setIsDragging(true)
    setDragStart(point)
    setInitialTranslate(viewTransformation.translate)

    // Check if we clicked on a node
    const nodeRadius = graph.style['node-radius'] || 40
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
        const nodeRadius = graph.style['node-radius'] || 40
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

  // Handle mouse move event
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
    
    // Handle relationship creation
    if (isCreatingRelationship && relationshipStartNode) {
      setRelationshipEndPoint(graphPoint)
      return
    }

    if (!isDragging || !dragStart) return

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
          updateNode(nodeId, { position: newPosition })
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

  // Handle mouse up event
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
    
    // Handle relationship creation completion
    if (isCreatingRelationship && relationshipStartNode) {
      console.log('Completing relationship creation')
      
      // Check if we released on a node
      const nodeRadius = graph.style['node-radius'] || 40
      let targetNodeId = null
      
      for (const nodeId in graph.nodes) {
        if (nodeId !== relationshipStartNode) {
          const node = graph.nodes[nodeId]
          const distance = Math.sqrt(
            Math.pow(graphPoint.x - node.position.x, 2) + 
            Math.pow(graphPoint.y - node.position.y, 2)
          )
          
          if (distance <= nodeRadius) {
            targetNodeId = nodeId
            break
          }
        }
      }
      
      if (targetNodeId) {
        console.log(`Creating relationship from ${relationshipStartNode} to ${targetNodeId}`)
        // Create the relationship
        const relId = addRelationship(relationshipStartNode, targetNodeId, 'RELATES_TO')
        
        // Select the new relationship
        selectRelationship(relId)
        
        // Open the relationship editor
        setEditingRelationshipId(relId)
      }
      
      // Reset relationship creation state
      setIsCreatingRelationship(false)
      setRelationshipStartNode(null)
      setRelationshipEndPoint(null)
      return
    }
    
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
    
    const graphPoint = new Point(
      (point.x - viewTransformation.translate.dx) / viewTransformation.scale,
      (point.y - viewTransformation.translate.dy) / viewTransformation.scale
    )
    
    // 1. Check if we double-clicked on a node
    const nodeRadius = graph.style['node-radius'] || 40
    for (const nodeId in graph.nodes) {
      const node = graph.nodes[nodeId]
      if (node.position.distanceTo(graphPoint) <= nodeRadius) {
        console.log('Double clicked node:', nodeId);
        selectNode(nodeId) 
        setEditingNodeId(nodeId)
        setEditingRelationshipId(null) // Close relationship editor if open
        return // Found a node, stop here
      }
    }
    
    // 2. If not on a node, check if we double-clicked on a relationship
    const threshold = 5 / viewTransformation.scale; // Adjust threshold based on zoom
    for (const relationship of Object.values(graph.relationships)) {
      const fromNode = graph.nodes[relationship.from]
      const toNode = graph.nodes[relationship.to]
      if (!fromNode || !toNode) continue

      // --- Distance to line segment calculation (simplified) ---
      // Calculate approximate midpoint for simple check (more accurate check needed for curves/offsets)
      const midX = (fromNode.position.x + toNode.position.x) / 2;
      const midY = (fromNode.position.y + toNode.position.y) / 2;
      const midpoint = new Point(midX, midY);
      
      // Check distance to midpoint (simple check, might need refinement)
      if (graphPoint.distanceTo(midpoint) < (fromNode.position.distanceTo(toNode.position) / 2) + threshold) {
           // A more accurate check: distance from point to the line segment
           const lineVec = fromNode.position.vectorTo(toNode.position);
           const pointVec = fromNode.position.vectorTo(graphPoint);
           const lineLen = lineVec.magnitude(); // Use magnitude
           const lineLenSq = lineLen * lineLen; // Calculate square
           
           if (lineLenSq === 0) continue; // Avoid division by zero for self-loops
           
           const t = (pointVec.dx * lineVec.dx + pointVec.dy * lineVec.dy) / lineLenSq;
           const clampedT = Math.max(0, Math.min(1, t)); // Clamp projection onto the segment
           
           const closestPoint = fromNode.position.translate(lineVec.scale(clampedT));
           const distance = graphPoint.distanceTo(closestPoint); // Use distanceTo
           const distanceSq = distance * distance; // Calculate square

           if (distanceSq <= threshold * threshold) {
              console.log('Double clicked relationship:', relationship.id);
              selectRelationship(relationship.id)
              setEditingRelationshipId(relationship.id)
              setEditingNodeId(null) // Close node editor if open
              return // Found a relationship, stop here
           }
      }
      // --- End Distance Calculation ---
    }

    // 3. If not on a node or relationship, create a new node
    console.log('Double click on empty space, creating node.');
    const newNodeId = addNode(graphPoint, 'New Entity', [])
    selectNode(newNodeId) // Select the new node
    setEditingNodeId(newNodeId)
    setEditingRelationshipId(null)
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

    // Reduce sensitivity by 50% by using a smaller delta
    // Original: const delta = e.deltaY < 0 ? 1.1 : 0.9
    const delta = e.deltaY < 0 ? 1.05 : 0.95 // Reduced sensitivity by 50%
    
    // Calculate new scale with min/max limits
    const MIN_SCALE = 0.2 // Prevent zooming out too far
    const MAX_SCALE = 3.0 // Prevent excessive zooming in
    
    let newScale = viewTransformation.scale * delta
    
    // Apply scale limits
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))
    
    // Don't update if we're at the limits
    if (
      (newScale === MIN_SCALE && delta < 1.0) || 
      (newScale === MAX_SCALE && delta > 1.0)
    ) {
      return
    }

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