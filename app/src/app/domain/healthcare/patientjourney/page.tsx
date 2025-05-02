'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PatientJourneyGraph } from '@/app/domain/healthcare/patientjourney/components/PatientJourneyGraph'
import { PatientMedicalReport } from '@/app/domain/healthcare/patientjourney/components/PatientMedicalReport'
import { PatientSankeyChart } from '@/app/domain/healthcare/patientjourney/components/PatientSankeyChart'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function PatientJourneyPage() {
  const searchParams = useSearchParams()
  const [patientId, setPatientId] = useState<string>(searchParams.get('patientId') || '')
  const [patients, setPatients] = useState<Array<{ id: string, name: string }>>([])
  const [patientData, setPatientData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch list of patients for dropdown
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        // In a real implementation, this would call your API
        const response = await fetch('/api/domain/healthcare/patients')
        const data = await response.json()
        
        setPatients(data.patients || [])
      } catch (err) {
        console.error('Error fetching patients:', err)
        setError('Failed to load patients list')
      }
    }

    fetchPatients()
  }, [])

  // Fetch patient journey data when patientId changes
  useEffect(() => {
    if (!patientId) return

    const fetchPatientJourney = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Fetch patient journey data from API
        const response = await fetch(`/api/domain/healthcare/patients/${patientId}/journey`)
        const data = await response.json()
        
        setPatientData(data)
      } catch (err) {
        console.error('Error fetching patient journey:', err)
        setError('Failed to load patient journey data')
      } finally {
        setLoading(false)
      }
    }

    fetchPatientJourney()
  }, [patientId])

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/merge">
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Patient Journey Visualization</h1>
        </div>
        
        <div className="w-[250px]">
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a patient" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((patient, index) => (
                <SelectItem key={`patient-${patient.id}-${index}`} value={patient.id}>
                  {patient.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {patientId && !error ? (
        loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-[300px] w-full rounded-lg" />
              <Skeleton className="h-[300px] w-full rounded-lg" />
            </div>
          </div>
        ) : (
          patientData && (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Patient Information</CardTitle>
                  <CardDescription>Basic details about the patient</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {patientData.patientInfo?.id && (
                      <div>
                        <p className="text-sm text-muted-foreground">Patient ID</p>
                        <p className="font-medium">{patientData.patientInfo.id}</p>
                      </div>
                    )}
                    {(patientData.patientInfo?.firstName || patientData.patientInfo?.lastName) && (
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">
                          {patientData.patientInfo.firstName} {patientData.patientInfo.lastName}
                        </p>
                      </div>
                    )}
                    {/* {patientData.patientInfo?.age && (
                      <div>
                        <p className="text-sm text-muted-foreground">Age</p>
                        <p className="font-medium">{patientData.patientInfo.age}</p>
                      </div>
                    )} */}
                    {patientData.patientInfo?.diagnosis && (
                      <div>
                        <p className="text-sm text-muted-foreground">Primary Diagnosis</p>
                        <p className="font-medium">{patientData.patientInfo.diagnosis}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="timeline" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="timeline">Timeline Graph</TabsTrigger>
                  <TabsTrigger value="reports">Medical Reports</TabsTrigger>
                  <TabsTrigger value="sankey">Treatment Flow</TabsTrigger>
                </TabsList>
                
                <TabsContent value="timeline" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Patient Journey Timeline</CardTitle>
                      <CardDescription>
                        Chronological visualization of patient events, diagnoses, and procedures
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[600px]">
                      <PatientJourneyGraph patientData={patientData} />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="reports" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Medical Reports & Findings</CardTitle>
                      <CardDescription>
                        Summary of medical reports, abnormalities, and current status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PatientMedicalReport patientData={patientData} />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="sankey" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Treatment Flow Analysis</CardTitle>
                      <CardDescription>
                        Sankey diagram showing relationships between treatments, outcomes, and complications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[500px]">
                      <PatientSankeyChart patientData={patientData} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )
        )
      ) : (
        !error && (
          <div className="flex items-center justify-center h-[400px] border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">Select a patient to view their journey</p>
          </div>
        )
      )}
    </div>
  )
}
