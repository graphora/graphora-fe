'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { GraphData } from '@/types/graph'

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph').then(mod => mod.ForceGraph2D), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[600px] flex items-center justify-center text-gray-400">
      Loading graph...
    </div>
  )
})

interface GraphVisualizationProps {
  graphData: GraphData | null
}

interface SelectedElement {
  type: 'node' | 'link'
  data: any
}

export function GraphVisualization({ graphData }: GraphVisualizationProps) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [processedData, setProcessedData] = useState<any>(null)
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)

  // Add resize handler
  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('graph-container')
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight || 600
        })
      }
    }

    // Initial size
    updateDimensions()

    // Add resize listener
    window.addEventListener('resize', updateDimensions)

    // Cleanup
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  useEffect(() => {
    if (!graphData || !graphData.nodes.length) return

    setProcessedData({
      nodes: graphData.nodes.map(node => ({
        id: node.id,
        name: node.label,
        type: node.type,
        color: getNodeColor(node.type),
        ...node.properties
      })),
      links: graphData.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        name: edge.label,
        ...edge.properties
      }))
    })
  }, [graphData])

  const handleNodeClick = (node: any) => {
    setSelectedElement({ type: 'node', data: node })
  }

  const handleLinkClick = (link: any) => {
    setSelectedElement({ type: 'link', data: link })
  }

  const handleBackgroundClick = () => {
    setSelectedElement(null)
  }

  const nodeCanvasObject = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = `${node.type}: ${node.name}`
    const fontSize = 12/globalScale
    ctx.font = `${fontSize}px Sans-Serif`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    
    // Draw background for text
    const textWidth = ctx.measureText(label).width
    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2)
    ctx.fillRect(
      node.x - bckgDimensions[0] / 2,
      node.y - bckgDimensions[1] / 2 - fontSize,
      ...bckgDimensions
    )

    // Draw text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, node.x, node.y - fontSize)

    // Draw node circle
    ctx.beginPath()
    ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false)
    ctx.fillStyle = node.color
    ctx.fill()
  }

  const linkCanvasObject = (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const start = link.source
    const end = link.target

    // Calculate the middle point of the link
    const middleX = start.x + (end.x - start.x) / 2
    const middleY = start.y + (end.y - start.y) / 2

    // Draw the relationship label
    const label = link.name
    const fontSize = 12/globalScale
    ctx.font = `${fontSize}px Sans-Serif`
    
    // Draw background for text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    const textWidth = ctx.measureText(label).width
    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2)
    ctx.fillRect(
      middleX - bckgDimensions[0] / 2,
      middleY - bckgDimensions[1] / 2,
      ...bckgDimensions
    )

    // Draw text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, middleX, middleY)
  }

  if (!graphData || !processedData) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center text-gray-400">
        No graph data available
      </div>
    )
  }

  return (
    <div id="graph-container" className="w-full h-full min-h-[600px] relative border rounded-lg overflow-hidden">
      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={processedData}
        nodeLabel={null}
        linkLabel={null}
        nodeColor={node => node.color}
        linkColor={() => '#999999'}
        nodeRelSize={6}
        linkWidth={1}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        onBackgroundClick={handleBackgroundClick}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        linkCanvasObject={linkCanvasObject}
        linkCanvasObjectMode={() => 'after'}
        centerAt={() => ({ x: 0, y: 0 })}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        autoPauseRedraw={false}
      />
      
      {selectedElement && (
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-80">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {selectedElement.type === 'node' ? 'Node Properties' : 'Relationship Properties'}
            </h3>
            <button
              onClick={() => setSelectedElement(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          {selectedElement.type === 'node' && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Label:</span>
                <span>{selectedElement.data.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Name:</span>
                <span>{selectedElement.data.name}</span>
              </div>
              <div className="mt-4">
                <h4 className="font-medium mb-2">Properties:</h4>
                {Object.entries(selectedElement.data)
                  .filter(([key]) => !['id', 'name', 'type', 'color', 'index', 'x', 'y', 'vx', 'vy'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                      <span>{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {selectedElement.type === 'link' && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Type:</span>
                <span>{selectedElement.data.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">From:</span>
                <span>{selectedElement.data.source.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">To:</span>
                <span>{selectedElement.data.target.name}</span>
              </div>
              <div className="mt-4">
                <h4 className="font-medium mb-2">Properties:</h4>
                {Object.entries(selectedElement.data)
                  .filter(([key]) => !['source', 'target', 'name', 'index'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                      <span>{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Cache for consistent color assignment
const colorCache: Record<string, string> = {}
const seenTypes: string[] = []

function getNodeColor(type: string): string {
  // If type not seen before, add to seen types
  if (!colorCache[type]) {
    const index = seenTypes.length
    seenTypes.push(type)
    // Generate evenly distributed hue values based on the index
    const hue = index * (360 / Math.max(1, seenTypes.length))
    // Use high saturation and medium lightness for vibrant but readable colors
    colorCache[type] = `hsl(${hue}, 70%, 60%)`
  }

  return colorCache[type] || '#a0aec0'
} 