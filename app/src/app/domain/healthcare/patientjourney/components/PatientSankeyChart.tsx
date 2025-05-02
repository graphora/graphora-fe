'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface PatientSankeyChartProps {
  patientData: any
}

export function PatientSankeyChart({ patientData }: PatientSankeyChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!patientData || !chartRef.current) return
    
    // Initialize ECharts instance
    const chart = echarts.init(chartRef.current)
    
    // Create nodes and links for the Sankey diagram
    const nodes: { name: string }[] = []
    const links: { source: string; target: string; value: number }[] = []
    
    // Process journey events to create meaningful Sankey data
    const events = patientData.journeyEvents || []
    const reports = patientData.medicalReports || []
    const treatments = patientData.treatmentOutcomes || []
    
    // Add nodes for different categories
    const addNode = (name: string) => {
      if (!nodes.some(node => node.name === name)) {
        nodes.push({ name })
      }
    }
    
    // Add event type nodes
    const eventTypes = [...new Set(events.map((event: any) => event.type))]
    eventTypes.forEach(type => {
      if (typeof type === 'string' && type) {
        addNode(type)
      }
    })
    
    // Add diagnostic nodes
    events
      .filter((event: any) => event.type === 'Diagnosis')
      .forEach((event: any) => {
        if (typeof event.label === 'string' && event.label) {
          addNode(event.label)
        }
      })
    
    // Add procedure nodes
    events
      .filter((event: any) => event.type === 'Procedure')
      .forEach((event: any) => {
        if (typeof event.label === 'string' && event.label) {
          addNode(event.label)
        }
      })
    
    // Add treatment nodes
    treatments.forEach((treatment: any) => {
      if (typeof treatment.treatment === 'string' && treatment.treatment) {
        addNode(treatment.treatment)
      }
    })
    
    // Add outcome nodes
    treatments.forEach((treatment: any) => {
      if (typeof treatment.outcome === 'string' && treatment.outcome) {
        addNode(treatment.outcome)
      }
    })
    
    // Add complication nodes (if any)
    treatments
      .filter((treatment: any) => treatment.complication && treatment.complication !== 'None')
      .forEach((treatment: any) => {
        if (typeof treatment.complication === 'string' && treatment.complication) {
          addNode(treatment.complication)
        }
      })
    
    // Create links between event types and specific events
    events.forEach((event: any) => {
      if (event.type === 'Diagnosis' || event.type === 'Procedure') {
        if (typeof event.type === 'string' && typeof event.label === 'string' && event.type && event.label) {
          links.push({
            source: event.type,
            target: event.label,
            value: 1
          })
        }
      }
    })
    
    // Create links between diagnoses and procedures
    const diagnoses = events.filter((event: any) => event.type === 'Diagnosis')
    const procedures = events.filter((event: any) => event.type === 'Procedure')
    
    diagnoses.forEach((diagnosis: any) => {
      // Find procedures that happened after this diagnosis (within 7 days)
      procedures.forEach((procedure: any) => {
        if (typeof diagnosis.date === 'string' && typeof procedure.date === 'string' &&
            typeof diagnosis.label === 'string' && typeof procedure.label === 'string' && 
            diagnosis.date && procedure.date && diagnosis.label && procedure.label) {
          const diagnosisDate = new Date(diagnosis.date)
          const procedureDate = new Date(procedure.date)
          const daysDiff = Math.abs((procedureDate.getTime() - diagnosisDate.getTime()) / (1000 * 3600 * 24))
          
          if (daysDiff <= 7 && procedureDate >= diagnosisDate) {
            links.push({
              source: diagnosis.label,
              target: procedure.label,
              value: 1
            })
          }
        }
      })
    })
    
    // Create links between procedures and treatments
    procedures.forEach((procedure: any) => {
      treatments.forEach((treatment: any) => {
        if (typeof procedure.label === 'string' && typeof treatment.treatment === 'string' && 
            procedure.label && treatment.treatment) {
          if (treatment.treatment.includes(procedure.label) || 
              procedure.label.includes(treatment.treatment)) {
            links.push({
              source: procedure.label,
              target: treatment.treatment,
              value: 1
            })
          }
        }
      })
    })
    
    // Create links between treatments and outcomes
    treatments.forEach((treatment: any) => {
      if (typeof treatment.treatment === 'string' && typeof treatment.outcome === 'string' && 
          treatment.treatment && treatment.outcome) {
        links.push({
          source: treatment.treatment,
          target: treatment.outcome,
          value: 1
        })
        
        // Link outcomes to complications if any
        if (treatment.complication && 
            treatment.complication !== 'None' && 
            typeof treatment.complication === 'string' && treatment.complication) {
          links.push({
            source: treatment.outcome,
            target: treatment.complication,
            value: 1
          })
        }
      }
    })
    
    // Set chart options
    const option = {
      title: {
        text: 'Patient Treatment Flow Analysis',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove'
      },
      series: [
        {
          type: 'sankey',
          data: nodes,
          links: links,
          emphasis: {
            focus: 'adjacency'
          },
          levels: [
            {
              depth: 0,
              itemStyle: {
                color: '#ffa940'
              },
              lineStyle: {
                color: 'source',
                opacity: 0.6
              }
            },
            {
              depth: 1,
              itemStyle: {
                color: '#73d13d'
              },
              lineStyle: {
                color: 'source',
                opacity: 0.6
              }
            },
            {
              depth: 2,
              itemStyle: {
                color: '#40a9ff'
              },
              lineStyle: {
                color: 'source',
                opacity: 0.6
              }
            },
            {
              depth: 3,
              itemStyle: {
                color: '#9254de'
              },
              lineStyle: {
                color: 'source',
                opacity: 0.6
              }
            }
          ],
          lineStyle: {
            curveness: 0.5,
            opacity: 0.6
          },
          label: {
            fontSize: 12,
            position: 'right'
          }
        }
      ]
    }
    
    // Set chart option and render
    chart.setOption(option)
    
    // Handle resize
    const handleResize = () => {
      chart.resize()
    }
    
    window.addEventListener('resize', handleResize)
    
    // Cleanup
    return () => {
      chart.dispose()
      window.removeEventListener('resize', handleResize)
    }
  }, [patientData])
  
  return <div ref={chartRef} className="w-full h-full"></div>
}
