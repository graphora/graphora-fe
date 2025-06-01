'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Activity, Users, BarChart, ArrowRight } from 'lucide-react'

export default function HealthcareDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-3">Healthcare Analytics Dashboard</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Explore patient data, visualize healthcare journeys, and analyze medical outcomes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-border/50 hover:border-primary/20 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl text-foreground group-hover:text-primary transition-colors">
                Patient Journey
              </CardTitle>
              <CardDescription className="text-muted-foreground leading-relaxed">
                Visualize patient care pathways and treatment timelines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-40 flex items-center justify-center bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-lg transition-colors group-hover:bg-primary/10 dark:group-hover:bg-primary/15">
                <FileText className="h-16 w-16 text-primary/60 dark:text-primary/70 group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/domain/healthcare/patientjourney" className="w-full">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all duration-200">
                  View Patient Journeys
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-border/50 hover:border-primary/20 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl text-foreground group-hover:text-primary transition-colors">
                Clinical Outcomes
              </CardTitle>
              <CardDescription className="text-muted-foreground leading-relaxed">
                Analyze treatment effectiveness and patient outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-40 flex items-center justify-center bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 rounded-lg transition-colors group-hover:bg-emerald-500/10 dark:group-hover:bg-emerald-500/15">
                <BarChart className="h-16 w-16 text-emerald-600/60 dark:text-emerald-400/70 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant="outline" disabled>
                Coming Soon
              </Button>
            </CardFooter>
          </Card>

          <Card className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-border/50 hover:border-primary/20 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl text-foreground group-hover:text-primary transition-colors">
                Patient Registry
              </CardTitle>
              <CardDescription className="text-muted-foreground leading-relaxed">
                Access and manage comprehensive patient records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-40 flex items-center justify-center bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 dark:border-blue-500/20 rounded-lg transition-colors group-hover:bg-blue-500/10 dark:group-hover:bg-blue-500/15">
                <Users className="h-16 w-16 text-blue-600/60 dark:text-blue-400/70 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant="outline" disabled>
                Coming Soon
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">Healthcare Graph Analytics</h2>
          <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-secondary/5 dark:from-primary/10 dark:via-primary/5 dark:to-secondary/10 border-primary/20 shadow-lg">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row gap-8 items-center">
                <div className="lg:w-2/3 space-y-6">
                  <h3 className="text-2xl font-semibold text-foreground">
                    Visualize Patient Journeys with Neo4j Graph Technology
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    Our healthcare analytics platform leverages advanced graph visualization to help clinicians and researchers understand complex patient pathways, identify patterns in treatment outcomes, and optimize care protocols.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-500 dark:bg-emerald-400 mt-1 shadow-sm"></div>
                      <p className="text-foreground leading-relaxed">
                        Chronological visualization of patient events, diagnoses, and procedures
                      </p>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-500 dark:bg-blue-400 mt-1 shadow-sm"></div>
                      <p className="text-foreground leading-relaxed">
                        Interactive exploration of medical reports and treatment outcomes
                      </p>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-purple-500 dark:bg-purple-400 mt-1 shadow-sm"></div>
                      <p className="text-foreground leading-relaxed">
                        Sankey diagrams showing relationships between treatments and outcomes
                      </p>
                    </div>
                  </div>
                  <div className="mt-8">
                    <Link href="/domain/healthcare/patientjourney">
                      <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200">
                        Explore Patient Journey
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="lg:w-1/3 flex items-center justify-center">
                  <div className="w-40 h-40 bg-gradient-to-br from-primary/20 to-secondary/20 dark:from-primary/30 dark:to-secondary/30 rounded-2xl flex items-center justify-center shadow-lg">
                    <Activity className="h-20 w-20 text-primary dark:text-primary/90" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
