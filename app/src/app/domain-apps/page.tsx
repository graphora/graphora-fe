'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { 
  Activity, 
  FileText, 
  Building, 
  Brain, 
  ChartBar, 
  ArrowRight, 
  Database, 
  Network,
  BarChart3,
  Heart,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react'

export default function DomainAppsPage() {
  const router = useRouter()
  const [domainApps, setDomainApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch domain apps data
  useEffect(() => {
    const fetchDomainApps = async () => {
      try {
        const response = await fetch('/api/domain/apps')
        const data = await response.json()
        
        // Make sure we're setting the domains array from the response
        setDomainApps(data.domains || [])
      } catch (err) {
        console.error('Error fetching domain apps:', err)
        setError('Failed to load domain applications')
      } finally {
        setLoading(false)
      }
    }
    
    fetchDomainApps()
  }, [])

  // Sample domain apps for demonstration
  const sampleDomainApps = [
    {
      id: 'healthcare',
      name: 'Healthcare Analytics',
      description: 'Analyze patient pathways, treatment outcomes, and medical relationships',
      icon: <Heart className="h-6 w-6" />,
      path: '/domain-apps/healthcare',
      enabled: true,
      status: 'active',
      color: 'bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400',
      features: ['Patient Journey Mapping', 'Treatment Analysis', 'Outcome Prediction']
    },
    {
      id: 'financial',
      name: 'Financial Networks',
      description: 'Map financial relationships, detect fraud patterns, and analyze risk',
      icon: <TrendingUp className="h-6 w-6" />,
      path: '/domain-apps/financial',
      enabled: true,
      status: 'active',
      color: 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
      features: ['Risk Assessment', 'Fraud Detection', 'Portfolio Analysis']
    },
    {
      id: 'cybersecurity',
      name: 'Cybersecurity Intelligence',
      description: 'Visualize threat landscapes and security incident relationships',
      icon: <Shield className="h-6 w-6" />,
      path: '/domain-apps/cybersecurity',
      enabled: false,
      status: 'coming-soon',
      color: 'bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400',
      features: ['Threat Analysis', 'Incident Correlation', 'Attack Vector Mapping']
    },
    {
      id: 'supply-chain',
      name: 'Supply Chain Optimization',
      description: 'Optimize logistics networks and supplier relationships',
      icon: <Network className="h-6 w-6" />,
      path: '/domain-apps/supply-chain',
      enabled: false,
      status: 'coming-soon',
      color: 'bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
      features: ['Supplier Mapping', 'Route Optimization', 'Risk Assessment']
    }
  ]

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader
            title="Domain Applications"
            description="Specialized applications for different industries and use cases"
            icon={<BarChart3 className="h-6 w-6" />}
          />
          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="enhanced-card animate-pulse">
                  <div className="enhanced-card-header">
                    <div className="w-8 h-8 bg-muted rounded-lg" />
                    <div className="w-32 h-4 bg-muted rounded" />
                  </div>
                  <div className="enhanced-card-content space-y-3">
                    <div className="w-full h-3 bg-muted rounded" />
                    <div className="w-3/4 h-3 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Use sample data if API doesn't return data
  const displayApps = domainApps.length > 0 ? domainApps : sampleDomainApps

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Domain Applications"
          description="Specialized applications for different industries and use cases"
          icon={<BarChart3 className="h-6 w-6" />}
          actions={
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                Request Custom App
              </Button>
            </div>
          }
        />

        <div className="flex-1 overflow-auto p-6 space-y-8">
          {error && (
            <div className="bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg p-4">
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Domain Apps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayApps.map((domain) => (
              <Card key={domain.id} className="enhanced-card group hover:shadow-lg transition-all duration-200">
                <CardHeader className="enhanced-card-header">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${domain.color}`}>
                      {domain.icon}
                    </div>
                    <StatusIndicator 
                      status={domain.enabled ? 'success' : 'pending'} 
                      label={domain.enabled ? 'Active' : 'Coming Soon'}
                      size="sm"
                    />
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {domain.name}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="enhanced-card-content space-y-4">
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {domain.description}
                  </CardDescription>
                  
                  {domain.features && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-foreground">Key Features:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {domain.features.map((feature: string, index: number) => (
                          <li key={index} className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-0">
                  {domain.enabled ? (
                    <Link href={domain.path} className="w-full">
                      <Button className="w-full group-hover:bg-primary/90 transition-colors">
                        Open Application
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      <Loader2 className="h-4 w-4 mr-2" />
                      Coming Soon
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Custom Domain App CTA */}
          <Card className="enhanced-card bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800/50">
            <CardContent className="enhanced-card-content">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                  <h3 className="text-xl font-bold text-foreground">
                    Need a Custom Domain Application?
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We can build specialized graph visualization applications tailored to your industry or specific use case. 
                    Get in touch to discuss your requirements.
                  </p>
                </div>
                <Button className="bg-primary hover:bg-primary/90">
                  Contact Our Team
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
