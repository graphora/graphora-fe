'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Activity, Users, BarChart, ArrowRight } from 'lucide-react'

export default function HealthcareDashboard() {
  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Healthcare Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Explore patient data, visualize healthcare journeys, and analyze medical outcomes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Patient Journey</CardTitle>
            <CardDescription>
              Visualize patient care pathways and treatment timelines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-center justify-center bg-muted/20 rounded-md">
              <FileText className="h-16 w-16 text-primary/30" />
            </div>
          </CardContent>
          <CardFooter>
            <Link href="/domain/healthcare/patientjourney" className="w-full">
              <Button className="w-full">
                View Patient Journeys
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Clinical Outcomes</CardTitle>
            <CardDescription>
              Analyze treatment effectiveness and patient outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-center justify-center bg-muted/20 rounded-md">
              <BarChart className="h-16 w-16 text-primary/30" />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="outline">
              Coming Soon
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Patient Registry</CardTitle>
            <CardDescription>
              Access and manage comprehensive patient records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-center justify-center bg-muted/20 rounded-md">
              <Users className="h-16 w-16 text-primary/30" />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="outline">
              Coming Soon
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Healthcare Graph Analytics</h2>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="md:w-2/3">
                <h3 className="text-xl font-medium mb-2">Visualize Patient Journeys with Neo4j Graph Technology</h3>
                <p className="text-muted-foreground mb-4">
                  Our healthcare analytics platform leverages advanced graph visualization to help clinicians and researchers understand complex patient pathways, identify patterns in treatment outcomes, and optimize care protocols.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-green-500 mt-1 mr-3"></div>
                    <p>Chronological visualization of patient events, diagnoses, and procedures</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-500 mt-1 mr-3"></div>
                    <p>Interactive exploration of medical reports and treatment outcomes</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-purple-500 mt-1 mr-3"></div>
                    <p>Sankey diagrams showing relationships between treatments and outcomes</p>
                  </div>
                </div>
                <div className="mt-6">
                  <Link href="/domain/healthcare/patientjourney">
                    <Button>
                      Explore Patient Journey
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="md:w-1/3 flex items-center justify-center">
                <Activity className="h-32 w-32 text-primary/40" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
