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
    <div className="w-full h-full">
      {/* Timeline container */}
      <div className="relative p-4 pt-10">
        {/* Timeline events */}
        <div className="relative mt-8">
          {/* Main timeline line */}
          <div className="absolute h-1 bg-gray-300 left-0 right-0" style={{ top: '20px' }}></div>
          
          {/* Timeline nodes with dots, lines and cards */}
          <div className="flex justify-between">
            {graphData.nodes.map((node, index) => {
              const isTop = index % 2 === 0;
              const verticalLineHeight = isTop ? 40 : 100;
              
              return (
                <div key={`node-${node.id}`} className="relative" style={{ width: `${100 / graphData.nodes.length}%` }}>
                  {/* Date label */}
                  <div className="absolute text-xs font-medium text-gray-600 whitespace-nowrap" 
                    style={{ 
                      top: '0px',
                      left: '50%',
                      transform: 'translateX(-50%)'
                    }}>
                    {node.properties.date}
                  </div>
                  
                  {/* Timeline dot - positioned exactly on the line */}
                  <div className="absolute rounded-full z-10" 
                    style={{ 
                      backgroundColor: node.color,
                      width: '8px',
                      height: '8px',
                      top: '20px',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      border: '1px solid white'
                    }}>
                  </div>
                  
                  {/* Vertical connecting line - starts from the dot */}
                  <div 
                    style={{
                      position: 'absolute',
                      top: '20px',
                      left: '50%',
                      width: '2px',
                      height: `${verticalLineHeight}px`,
                      backgroundColor: node.color,
                      transform: 'translateX(-50%)'
                    }}>
                  </div>
                  
                  {/* Event card */}
                  <div className="absolute border border-gray-200 rounded p-3 bg-white shadow-sm"
                    style={{
                      borderLeftColor: node.color,
                      borderLeftWidth: '3px',
                      maxWidth: '180px',
                      width: '90%',
                      top: `${20 + verticalLineHeight}px`,
                      left: '50%',
                      transform: 'translateX(-50%)'
                    }}>
                    <div className="flex items-center mb-1">
                      <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: node.color }}></div>
                      <h4 className="font-medium text-sm">{node.label}</h4>
                    </div>
                    <div className="text-xs">{node.properties.details}</div>
                    <div className="mt-2">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{node.type}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
