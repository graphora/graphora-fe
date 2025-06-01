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
    <div className="w-full h-full bg-background">
      {/* Timeline container */}
      <div className="relative p-6 pt-12">
        {/* Timeline events */}
        <div className="relative">
          {/* Timeline nodes with clean design */}
          <div className="flex justify-between items-start relative">
            {/* HORIZONTAL LINE - Simple and guaranteed visible */}
            <div 
              className="absolute left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-600"
              style={{ 
                top: '48px',
                zIndex: 1
              }}
            ></div>
            
            {graphData.nodes.map((node, index) => {
              const isTop = index % 2 === 0;
              
              return (
                <div key={`node-${node.id}`} className="relative flex flex-col items-center" style={{ width: `${100 / graphData.nodes.length}%` }}>
                  {/* Date label */}
                  <div className="mb-4 text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded border border-border/50 whitespace-nowrap">
                    {node.properties.date}
                  </div>
                  
                  {/* Timeline dot - clean and simple */}
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-sm relative"
                    style={{ 
                      backgroundColor: node.color,
                      zIndex: 10
                    }}
                  ></div>
                  
                  {/* Vertical connector line - simple and clean */}
                  <div className="w-0.5 bg-gray-300 dark:bg-gray-600 h-8 my-2"></div>
                  
                  {/* Event card - clean professional design */}
                  <div 
                    className={`bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 ${
                      isTop ? 'mb-4' : 'mt-4'
                    }`}
                    style={{ width: '220px', maxWidth: '90vw' }}
                  >
                    {/* Event header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-foreground leading-tight mb-1">
                          {node.label}
                        </h4>
                        <p className="text-xs text-muted-foreground font-medium">
                          {node.properties.type}
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <span 
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-white rounded-md"
                          style={{ backgroundColor: node.color }}
                        >
                          {node.type}
                        </span>
                      </div>
                    </div>
                    
                    {/* Event details */}
                    {node.properties.details && (
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {node.properties.details.length > 120 
                          ? `${node.properties.details.substring(0, 120)}...` 
                          : node.properties.details
                        }
                      </div>
                    )}
                    
                    {/* Event number */}
                    <div className="mt-3 pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground/70 font-mono">
                        Event {index + 1}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Timeline progression arrows */}
          {/* {graphData.nodes.length > 1 && (
            <div className="absolute left-0 right-0 flex justify-between items-center pointer-events-none z-30" style={{ top: '44px' }}>
              {graphData.nodes.slice(0, -1).map((_, index) => (
                <div key={`arrow-${index}`} className="flex-1 flex justify-end pr-4" style={{ width: `${100 / graphData.nodes.length}%` }}>
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg 
                      className="w-4 h-4 text-primary/80" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )} */}
        </div>
        
        {/* Timeline summary */}
        <div className="mt-8 pt-6 border-t border-border/30">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total Events: {graphData.nodes.length}</span>
            <span>
              Timeline: {graphData.nodes[0]?.properties.date} - {graphData.nodes[graphData.nodes.length - 1]?.properties.date}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
