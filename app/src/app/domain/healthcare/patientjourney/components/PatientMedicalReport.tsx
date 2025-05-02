'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PatientMedicalReportProps {
  patientData: any
}

export function PatientMedicalReport({ patientData }: PatientMedicalReportProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!patientData?.medicalReports || !chartRef.current) return
    
    // Initialize ECharts instance
    const chart = echarts.init(chartRef.current)
    
    // Process data for the chart
    const reports = patientData.medicalReports || []
    const dates = reports.map((report: any) => report.date || '')
    
    // Create a radar chart to show the progression of patient status
    const statusValues = reports.map((report: any) => {
      const statusMap: Record<string, number> = {
        'Acute': 1,
        'Critical': 0,
        'Treated': 2,
        'Improving': 3,
        'In progress': 3,
        'Recovering well': 4,
        'Resolved': 5
      }
      
      // Extract the status value or default to 0
      const statusText = report.status || ''
      let statusValue = 0
      
      // Check for each status keyword in the text
      Object.entries(statusMap).forEach(([key, value]) => {
        if (statusText.includes(key)) {
          statusValue = value
        }
      })
      
      return statusValue
    })
    
    // Create option for the chart
    const option = {
      title: {
        text: 'Patient Recovery Progress',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['Recovery Status'],
        bottom: 0
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        name: 'Status',
        min: 0,
        max: 5,
        interval: 1,
        axisLabel: {
          formatter: function(value: number) {
            const labels = ['Critical', 'Acute', 'Treated', 'Improving', 'Recovering', 'Resolved']
            return labels[value] || value
          }
        }
      },
      series: [
        {
          name: 'Recovery Status',
          type: 'line',
          data: statusValues,
          markLine: {
            data: [
              {
                name: 'Target Recovery',
                yAxis: 4
              }
            ]
          },
          lineStyle: {
            width: 3
          },
          itemStyle: {
            color: '#10b981'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: 'rgba(16, 185, 129, 0.5)'
              },
              {
                offset: 1,
                color: 'rgba(16, 185, 129, 0.1)'
              }
            ])
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
  
  if (!patientData?.medicalReports) {
    return <div>No medical report data available</div>
  }
  
  return (
    <div className="space-y-6">
      <div ref={chartRef} className="w-full h-[300px]"></div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Medical Reports Timeline</h3>
        
        {patientData.medicalReports.map((report: any, index: number) => (
          <Card key={`report-${report.date}-${index}`} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                <div className="bg-muted p-4 md:w-[180px] flex flex-col justify-center items-center md:items-start">
                  <div className="text-sm text-muted-foreground">Date</div>
                  <div className="font-medium">{report.date || ''}</div>
                  <div className="mt-2">
                    <Badge variant={getStatusVariant(report.status)}>{report.status || ''}</Badge>
                  </div>
                </div>
                
                <div className="p-4 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{report.type || ''}</h4>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Findings:</span> {report.findings || ''}
                    </div>
                    
                    {report.abnormalities && (
                      <div>
                        <span className="font-medium text-amber-600">Abnormalities:</span> {report.abnormalities || ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {patientData.treatmentOutcomes && (
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-medium">Treatment Outcomes</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patientData.treatmentOutcomes.map((item: any, index: number) => (
              <Card key={`treatment-${item.treatment}-${index}`}>
                <CardContent className="p-4">
                  <div className="font-medium">{item.treatment || ''}</div>
                  <div className="flex justify-between mt-2">
                    <Badge variant={getOutcomeVariant(item.outcome)}>
                      {item.outcome || ''}
                    </Badge>
                    
                    {item.complication && item.complication !== 'None' ? (
                      <Badge variant="destructive">{item.complication || ''}</Badge>
                    ) : (
                      <Badge variant="outline">No complications</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to determine badge variant based on status
function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" | null | undefined {
  if (!status) return "outline"
  
  if (status.includes('Critical') || status.includes('Severe')) {
    return "destructive"
  } else if (status.includes('Acute')) {
    return "destructive" 
  } else if (status.includes('Treated') || status.includes('In progress')) {
    return "secondary"
  } else if (status.includes('Improving') || status.includes('Recovering')) {
    return "default"
  } else if (status.includes('Resolved')) {
    return "outline"
  }
  
  return "outline"
}

// Helper function to determine badge variant based on outcome
function getOutcomeVariant(outcome: string): "default" | "secondary" | "destructive" | "outline" | null | undefined {
  if (!outcome) return "outline"
  
  if (outcome.includes('Successful') || outcome.includes('Effective')) {
    return "default"
  } else if (outcome.includes('Improving') || outcome.includes('In progress')) {
    return "secondary"
  } else if (outcome.includes('Failed') || outcome.includes('Ineffective')) {
    return "destructive"
  }
  
  return "outline"
}
