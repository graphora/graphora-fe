'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { type Node, type Edge, type GraphData } from '@/types/graph'

// Dynamically import the Neo4j NVL component to avoid SSR issues
const InteractiveNvlWrapper = dynamic(
  () => import('@neo4j-nvl/react').then(mod => mod.InteractiveNvlWrapper),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading graph visualization...</span>
      </div>
    )
  }
)

// Color mapping for different node types
const NODE_TYPE_COLORS: Record<string, string> = {
  MedicalEvent: '#ef4444', // Red
  Diagnosis: '#8b5cf6', // Purple
  Procedure: '#3b82f6', // Blue
  Treatment: '#10b981', // Green
  Medication: '#f59e0b', // Amber
  DiagnosticTest: '#ec4899', // Pink
  MedicalExamination: '#14b8a6', // Teal
  FollowUp: '#22d3ee', // Cyan
  default: '#6b7280', // Gray
}

interface ProcessedNode {
  id: string;
  label: string;
  caption: string;
  color: string;
  size: number;
  type: string;
  properties: Record<string, any>;
  x?: number;
  y?: number;
}

interface ProcessedRel {
  id: string;
  from: string;
  to: string;
  label: string;
  caption: string;
  properties: Record<string, any>;
}

interface PatientJourneyGraphProps {
  patientData: any;
}

export function PatientJourneyGraph({ patientData }: PatientJourneyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [graphData, setGraphData] = useState<{ nodes: ProcessedNode[], rels: ProcessedRel[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patientData) return

    try {
      // Process journey events into graph data
      const events = patientData.journeyEvents || []
      
      // Sort events by date
      const sortedEvents = [...events].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      
      // Create nodes from events
      const nodes: ProcessedNode[] = sortedEvents.map((event, index) => ({
        id: event.id || `event-${index}`,
        label: event.label || `Event ${index}`,
        caption: `${event.label || `Event ${index}`} (${event.date || 'Unknown date'})`,
        color: NODE_TYPE_COLORS[event.nodeType] || NODE_TYPE_COLORS.default,
        size: 40,
        type: event.nodeType || 'default',
        properties: {
          date: event.date || '',
          type: event.type || '',
          details: event.details || '',
          nodeType: event.nodeType || ''
        },
        // Position nodes in a timeline layout
        x: index * 100,
        y: (index % 2) * 100 + 100
      }))
      
      // Create relationships between consecutive events
      const rels: ProcessedRel[] = []
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        rels.push({
          id: `rel-${i}`,
          from: sortedEvents[i].id,
          to: sortedEvents[i + 1].id,
          label: 'FOLLOWED_BY',
          caption: 'FOLLOWED_BY',
          properties: {
            timeDiff: getDaysBetween(sortedEvents[i].date, sortedEvents[i + 1].date)
          }
        })
      }
      
      // Add relationships between related events (same date)
      sortedEvents.forEach((event, i) => {
        sortedEvents.forEach((otherEvent, j) => {
          if (i !== j && event.date === otherEvent.date && !rels.some(r => 
            (r.from === event.id && r.to === otherEvent.id) || 
            (r.from === otherEvent.id && r.to === event.id)
          )) {
            rels.push({
              id: `rel-same-date-${i}-${j}`,
              from: event.id,
              to: otherEvent.id,
              label: 'SAME_DATE',
              caption: 'SAME_DATE',
              properties: {}
            })
          }
        })
      })
      
      setGraphData({ nodes, rels })
    } catch (err) {
      console.error('Error processing graph data:', err)
      setError('Failed to process patient journey data')
    } finally {
      setLoading(false)
    }
  }, [patientData])

  // Helper function to calculate days between dates
  function getDaysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    const diffTime = Math.abs(d2.getTime() - d1.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Processing patient journey data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  if (!graphData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">No patient journey data available</div>
      </div>
    )
  }

  // Create a timeline visualization using HTML/CSS instead of Neo4j NVL
  // This is a fallback since we're having issues with the Neo4j NVL library
  return (
    <div className="w-full h-full overflow-auto">
      <div className="relative w-full min-w-[1200px] p-8">
        {/* Timeline line */}
        <div className="absolute left-0 right-0 h-1 bg-gray-200 top-1/2 transform -translate-y-1/2"></div>
        
        {/* Timeline nodes */}
        <div className="relative">
          {graphData.nodes.map((node, index) => (
            <div 
              key={`timeline-node-${node.id}-${index}`}
              className="absolute rounded-lg p-4 shadow-lg border border-gray-200 w-64 bg-white"
              style={{
                left: `${index * 180}px`,
                top: index % 2 === 0 ? '20px' : '200px',
                borderLeftColor: node.color,
                borderLeftWidth: '4px'
              }}
            >
              <div className="absolute w-1 h-16 bg-gray-200" style={{
                left: '50%',
                top: index % 2 === 0 ? '100%' : '-64px'
              }}></div>
              <div className="absolute w-3 h-3 rounded-full bg-white border-2 border-primary" style={{
                left: '50%',
                top: index % 2 === 0 ? 'calc(100% + 64px)' : '-8px',
                transform: 'translateX(-50%)'
              }}></div>
              <div className="flex items-start mb-2">
                <div 
                  className="w-3 h-3 rounded-full mr-2 mt-1 flex-shrink-0" 
                  style={{ backgroundColor: node.color }}
                ></div>
                <h4 className="font-medium text-sm">{node.label}</h4>
              </div>
              <div className="text-xs text-gray-500 mb-1">{node.properties.date}</div>
              <div className="text-xs">{node.properties.details}</div>
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs">
                  {node.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
