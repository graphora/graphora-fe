'use client'

import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[PatientLabResults]', ...args)
  }
}

interface PatientLabResultsProps {
  patientData: any;
}

export function PatientLabResults({ patientData }: PatientLabResultsProps) {
  const trendChartRef = useRef<HTMLDivElement>(null)
  const distributionChartRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [processedData, setProcessedData] = useState<any>(null)

  // Debug the incoming data structure
  useEffect(() => {
    debug('Received patient data for lab results:', patientData)

    // Process the laboratory results data
    if (patientData?.laboratoryResults) {
      // Remove duplicates by ID
      const uniqueResults = patientData.laboratoryResults.reduce((acc: any[], lab: any) => {
        if (!acc.find((l: any) => l.id === lab.id)) {
          // Deduplicate components by ID as well
          if (lab.components) {
            const uniqueComponents = lab.components.reduce((compAcc: any[], comp: any) => {
              if (!compAcc.find((c: any) => c.id === comp.id && c.name === comp.name)) {
                compAcc.push(comp);
              }
              return compAcc;
            }, []);
            
            lab = {
              ...lab,
              components: uniqueComponents
            };
          }
          acc.push(lab);
        }
        return acc;
      }, []);

      setProcessedData({
        ...patientData,
        laboratoryResults: uniqueResults
      });
    } else {
      setProcessedData(patientData);
    }
    
    setLoading(false);
  }, [patientData]);

  // Initialize charts when data and refs are ready
  useEffect(() => {
    if (!processedData || !trendChartRef.current || !distributionChartRef.current) return;

    const labResults = processedData.laboratoryResults || [];
    debug('Lab results count for charts:', labResults.length)

    // Process lab results data
    setLoading(false);

    // Initialize charts
    const trendChart = echarts.init(trendChartRef.current)
    const distributionChart = echarts.init(distributionChartRef.current)

    // Group test components by name
    const testsByName: Record<string, any[]> = {}
    labResults.forEach((lab: any) => {
      const components = lab.components || []
      components.forEach((component: any) => {
        // Create a unique key for each component to avoid duplicates
        const componentKey = component.name;
        if (!testsByName[componentKey]) {
          testsByName[componentKey] = []
        }
        
        // Check if this exact date/value combination already exists
        const exists = testsByName[componentKey].some(
          (existingComp) => 
            existingComp.date === lab.date && 
            existingComp.value === component.value
        );
        
        if (!exists) {
          testsByName[componentKey].push({
            ...component,
            date: lab.date,
            time: lab.time
          });
        }
      })
    })

    // Sort tests by date for trend chart
    Object.keys(testsByName).forEach(testName => {
      testsByName[testName].sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time || '00:00:00'}`)
        const dateB = new Date(`${b.date} ${b.time || '00:00:00'}`)
        return dateA.getTime() - dateB.getTime()
      })
    })

    // Create trend chart for selected tests
    const commonTests = ['Hemoglobin', 'White Blood Cell Count', 'Platelet Count', 'Glucose']
    const availableTests = commonTests.filter(test => testsByName[test] && testsByName[test].length > 1)

    // Prepare data for trend chart
    const series = availableTests.map(test => {
      const data = testsByName[test].map(item => {
        // Convert string values to numbers for charting
        let numValue = parseFloat(item.value)
        if (isNaN(numValue)) {
          // Try to extract numeric value from string
          const match = item.value.match(/(\d+(\.\d+)?)/)
          numValue = match ? parseFloat(match[1]) : 0
        }
        return [item.date, numValue]
      })

      return {
        name: test,
        type: 'line',
        data: data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        emphasis: {
          focus: 'series'
        }
      }
    })

    // Configure trend chart
    const trendOption = {
      title: {
        text: 'Lab Results Trends',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        formatter: function (params: any) {
          let result = params[0].axisValue + '<br/>'
          params.forEach((param: any) => {
            const test = availableTests.find(t => t === param.seriesName)
            const testData = testsByName[test!].find(t => t.date === param.axisValue)
            result += `${param.marker} ${param.seriesName}: ${param.value[1]} ${testData?.units || ''}`
            if (testData?.referenceRange) {
              result += ` (Ref: ${testData.referenceRange})`
            }
            result += '<br/>'
          })
          return result
        }
      },
      legend: {
        data: availableTests,
        orient: 'horizontal',
        bottom: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: [...new Set(availableTests.flatMap(test => testsByName[test].map(item => item.date)))]
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: {
          formatter: '{value}'
        }
      },
      series: series
    }

    // Configure distribution chart
    const allTestNames = Object.keys(testsByName)
    const abnormalCounts: Record<string, number> = {}
    const normalCounts: Record<string, number> = {}

    allTestNames.forEach(test => {
      abnormalCounts[test] = 0
      normalCounts[test] = 0

      testsByName[test].forEach(item => {
        if (item.referenceRange) {
          // Check if value is within reference range
          let numValue: number
          if (typeof item.value === 'string' && item.value.startsWith('<')) {
            numValue = parseFloat(item.value.substring(1))
            // For values like "<0.1", we consider them below the range
            return true
          } else {
            numValue = parseFloat(item.value)
            if (isNaN(numValue)) {
              const match = item.value?.match?.(/(\d+(\.\d+)?)/)
              numValue = match ? parseFloat(match[1]) : 0
            }
          }

          // Handle different reference range formats
          if (item.referenceRange.includes('-')) {
            const rangeMatch = item.referenceRange.match(/(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)/)
            if (rangeMatch) {
              const min = parseFloat(rangeMatch[1])
              const max = parseFloat(rangeMatch[3])
              return numValue < min || numValue > max
            }
          } else if (item.referenceRange.includes('>')) {
            const minMatch = item.referenceRange.match(/>(\d+(\.\d+)?)/)
            if (minMatch) {
              const min = parseFloat(minMatch[1])
              return numValue <= min
            }
          } else if (item.referenceRange.includes('<')) {
            const maxMatch = item.referenceRange.match(/<(\d+(\.\d+)?)/)
            if (maxMatch) {
              const max = parseFloat(maxMatch[1])
              return numValue >= max
            }
          } else if (item.referenceRange === 'NEG' || item.referenceRange === 'NORM') {
            // For values that should be negative or normal
            return item.value !== 'NEGATIVE' && item.value !== 'NORMAL'
          }

          return false
        } else {
          // No reference range, consider normal
          normalCounts[test]++
        }
      })
    })

    // Sort tests by abnormal count for distribution chart
    const sortedTests = allTestNames
      .filter(test => abnormalCounts[test] > 0)
      .sort((a, b) => abnormalCounts[b] - abnormalCounts[a])
      .slice(0, 10) // Top 10 tests with abnormalities

    const distributionOption = {
      title: {
        text: 'Abnormal vs Normal Test Results',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['Abnormal', 'Normal'],
        orient: 'horizontal',
        bottom: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'value'
      },
      yAxis: {
        type: 'category',
        data: sortedTests,
        axisLabel: {
          width: 120,
          overflow: 'truncate'
        }
      },
      series: [
        {
          name: 'Abnormal',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: sortedTests.map(test => abnormalCounts[test]),
          itemStyle: {
            color: '#ef4444'
          }
        },
        {
          name: 'Normal',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: sortedTests.map(test => normalCounts[test]),
          itemStyle: {
            color: '#10b981'
          }
        }
      ]
    }

    // Set chart options
    trendChart.setOption(trendOption)
    distributionChart.setOption(distributionOption)

    // Handle resize
    const handleResize = () => {
      trendChart.resize()
      distributionChart.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      trendChart.dispose()
      distributionChart.dispose()
    }
  }, [processedData, activeTab])

  // Helper function to determine if a test result is abnormal
  const isAbnormal = (component: any) => {
    if (!component.referenceRange) return false

    // Handle special case for values like "<0.1"
    let numValue: number
    if (typeof component.value === 'string' && component.value.startsWith('<')) {
      numValue = parseFloat(component.value.substring(1))
      // For values like "<0.1", we consider them below the range
      return true
    } else {
      numValue = parseFloat(component.value)
      if (isNaN(numValue)) {
        const match = component.value?.match?.(/(\d+(\.\d+)?)/)
        numValue = match ? parseFloat(match[1]) : 0
      }
    }

    // Handle different reference range formats
    if (component.referenceRange.includes('-')) {
      const rangeMatch = component.referenceRange.match(/(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)/)
      if (rangeMatch) {
        const min = parseFloat(rangeMatch[1])
        const max = parseFloat(rangeMatch[3])
        return numValue < min || numValue > max
      }
    } else if (component.referenceRange.includes('>')) {
      const minMatch = component.referenceRange.match(/>(\d+(\.\d+)?)/)
      if (minMatch) {
        const min = parseFloat(minMatch[1])
        return numValue <= min
      }
    } else if (component.referenceRange.includes('<')) {
      const maxMatch = component.referenceRange.match(/<(\d+(\.\d+)?)/)
      if (maxMatch) {
        const max = parseFloat(maxMatch[1])
        return numValue >= max
      }
    } else if (component.referenceRange === 'NEG' || component.referenceRange === 'NORM') {
      // For values that should be negative or normal
      return component.value !== 'NEGATIVE' && component.value !== 'NORMAL'
    }

    return false
  }

  // Get badge variant based on abnormality
  const getTestVariant = (component: any) => {
    return isAbnormal(component) ? 'destructive' : 'outline'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading laboratory results...</span>
      </div>
    )
  }

  // If there are no lab results after processing, show a message
  if (!processedData?.laboratoryResults || processedData.laboratoryResults.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No laboratory results available for this patient</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="details">Test Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Abnormal Results Summary</CardTitle>
                <CardDescription>
                  Tests outside normal reference ranges
                </CardDescription>
              </CardHeader>
              <CardContent>
                {processedData.laboratoryResults
                  .flatMap((lab: any) => {
                    // Create a map to deduplicate components within each lab result
                    const uniqueComponents = new Map();
                    
                    (lab.components || [])
                      .filter((component: any) => isAbnormal(component))
                      .forEach((component: any) => {
                        const key = `${component.name}-${component.value}`;
                        if (!uniqueComponents.has(key)) {
                          uniqueComponents.set(key, {
                            ...component,
                            date: lab.date,
                            time: lab.time
                          });
                        }
                      });
                      
                    return Array.from(uniqueComponents.values());
                  })
                  .length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(
                      processedData.laboratoryResults
                        .flatMap((lab: any) => {
                          // Create a map to deduplicate components within each lab result
                          const uniqueComponents = new Map();
                          
                          (lab.components || [])
                            .filter((component: any) => isAbnormal(component))
                            .forEach((component: any) => {
                              const key = `${component.name}-${component.value}`;
                              if (!uniqueComponents.has(key)) {
                                uniqueComponents.set(key, {
                                  ...component,
                                  date: lab.date,
                                  time: lab.time
                                });
                              }
                            });
                            
                          return Array.from(uniqueComponents.values());
                        })
                        .reduce((acc: Record<string, any[]>, component: any) => {
                          if (!acc[component.name]) {
                            acc[component.name] = []
                          }
                          acc[component.name].push(component)
                          return acc
                        }, {} as Record<string, any[]>)
                    )
                      .sort((a, b) => (b[1] as any[]).length - (a[1] as any[]).length)
                      .slice(0, 8)
                      .map(([testName, components]) => (
                        <div key={testName} className="border rounded p-3">
                          <div className="font-medium mb-1">{testName}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(components as any[]).slice(0, 4).map((component, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{component.date}</span>
                                <Badge variant="destructive">
                                  {component.value} {component.units}
                                </Badge>
                              </div>
                            ))}
                          </div>
                          {(components as any[]).length > 4 && (
                            <div className="text-xs text-center text-muted-foreground mt-1">
                              + {(components as any[]).length - 4} more abnormal results
                            </div>
                          )}
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No abnormal results detected</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Recent Lab Results</CardTitle>
                <CardDescription>
                  Most recent laboratory findings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {processedData.laboratoryResults
                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 1)
                    .map((lab: any, labIndex: number) => (
                      <div key={`recent-lab-${labIndex}`} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">Date: </span>
                            <span>{lab.date}</span>
                            {lab.time && <span> {lab.time}</span>}
                          </div>
                          {lab.facility && (
                            <Badge variant="secondary">{lab.facility}</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {(lab.components || [])
                            .filter((component: any) => isAbnormal(component))
                            .slice(0, 6)
                            .map((component: any, compIndex: number) => (
                              <div key={`recent-comp-${compIndex}`} className="border rounded p-2">
                                <div className="flex justify-between">
                                  <span className="font-medium">{component.name}</span>
                                  <Badge variant={getTestVariant(component)}>
                                    {component.value} {component.units}
                                  </Badge>
                                </div>
                                {component.referenceRange && (
                                  <div className="text-xs text-muted-foreground">
                                    Ref: {component.referenceRange}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>

                        {(lab.components || []).filter((c: any) => isAbnormal(c)).length > 6 && (
                          <div className="text-sm text-muted-foreground text-center">
                            + {(lab.components || []).filter((c: any) => isAbnormal(c)).length - 6} more abnormal results
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Test Result Trends</CardTitle>
              <CardDescription>
                Changes in key laboratory values over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processedData.laboratoryResults.length > 1 ? (
                <div ref={trendChartRef} className="h-[400px] w-full" />
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px]">
                  <div className="text-center mb-4">
                    <p className="text-muted-foreground">At least two lab results are needed to display trends</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                    {processedData.laboratoryResults.length === 1 && (
                      processedData.laboratoryResults[0].components
                        .filter((component: any) => 
                          ['Hemoglobin', 'White Blood Cell Count', 'WBC', 'Glucose', 'Platelet Count']
                            .includes(component.name)
                        )
                        .slice(0, 4)
                        .map((component: any, idx: number) => (
                          <div key={idx} className="border rounded-lg p-3 text-center">
                            <div className="font-medium mb-1">{component.name}</div>
                            <div className="text-2xl font-bold">
                              {component.value} <span className="text-sm font-normal">{component.units}</span>
                            </div>
                            {component.referenceRange && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Ref: {component.referenceRange}
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="space-y-4">
            {processedData.laboratoryResults
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((lab: any, labIndex: number) => (
                <Card key={`lab-${labIndex}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">
                        Laboratory Results - {lab.date}
                        {lab.time && <span className="text-sm font-normal ml-2">{lab.time}</span>}
                      </CardTitle>
                      {lab.facility && (
                        <Badge variant="secondary">{lab.facility}</Badge>
                      )}
                    </div>
                    <CardDescription>
                      {(lab.components || []).length} test components
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(lab.components || [])
                        // Group by category or sort alphabetically
                        .sort((a: any, b: any) => {
                          // Show abnormal results first
                          const aAbnormal = isAbnormal(a);
                          const bAbnormal = isAbnormal(b);
                          if (aAbnormal && !bAbnormal) return -1;
                          if (!aAbnormal && bAbnormal) return 1;
                          // Then sort alphabetically
                          return a.name.localeCompare(b.name);
                        })
                        .map((component: any, compIndex: number) => (
                          <div
                            key={`comp-${labIndex}-${compIndex}`}
                            className={`border rounded-lg p-3 ${isAbnormal(component) ? 'border-red-200 bg-red-50/30' : ''}`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{component.name}</span>
                              <Badge variant={getTestVariant(component)}>
                                {component.value} {component.units}
                              </Badge>
                            </div>
                            {component.referenceRange && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Reference Range: {component.referenceRange}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
