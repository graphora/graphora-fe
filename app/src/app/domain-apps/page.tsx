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

// Icon mapping for API data
const getIconComponent = (iconName: string) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    'Activity': <Activity className="h-8 w-8" />,
    'ChartBar': <ChartBar className="h-8 w-8" />,
    'FileText': <FileText className="h-8 w-8" />,
    'Building': <Building className="h-8 w-8" />,
    'Brain': <Brain className="h-8 w-8" />,
    'Database': <Database className="h-8 w-8" />,
    'Network': <Network className="h-8 w-8" />,
    'BarChart3': <BarChart3 className="h-8 w-8" />,
    'Heart': <Heart className="h-8 w-8" />,
    'TrendingUp': <TrendingUp className="h-8 w-8" />,
    'Shield': <Shield className="h-8 w-8" />,
    'Zap': <Zap className="h-8 w-8" />
  }
  
  return iconMap[iconName] || <Activity className="h-8 w-8" />
}

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
        
        // Transform API data to include proper icons and missing fields
        const transformedDomains = (data.domains || []).map((domain: any) => ({
          ...domain,
          name: domain.title || domain.name,
          icon: getIconComponent(domain.icon),
          color: getColorFromString(domain.color) || 'bg-gray-500/10 dark:bg-gray-500/20',
          iconColor: getIconColorFromString(domain.color) || 'text-gray-600 dark:text-gray-400',
          features: domain.features || ['Advanced Analytics', 'Data Visualization', 'Custom Reports']
        }))
        
        setDomainApps(transformedDomains)
      } catch (err) {
        console.error('Error fetching domain apps:', err)
        setError('Failed to load domain applications')
      } finally {
        setLoading(false)
      }
    }
    
    fetchDomainApps()
  }, [])

  // Helper function to convert color class to appropriate background and icon colors
  const getColorFromString = (colorClass: string) => {
    const colorMap: { [key: string]: string } = {
      'bg-red-600': 'bg-red-500/10 dark:bg-red-500/20',
      'bg-green-600': 'bg-emerald-500/10 dark:bg-emerald-500/20',
      'bg-blue-600': 'bg-blue-500/10 dark:bg-blue-500/20',
      'bg-purple-600': 'bg-purple-500/10 dark:bg-purple-500/20',
      'bg-orange-600': 'bg-orange-500/10 dark:bg-orange-500/20',
      'bg-yellow-600': 'bg-yellow-500/10 dark:bg-yellow-500/20'
    }
    return colorMap[colorClass]
  }

  const getIconColorFromString = (colorClass: string) => {
    const colorMap: { [key: string]: string } = {
      'bg-red-600': 'text-red-600 dark:text-red-400',
      'bg-green-600': 'text-emerald-600 dark:text-emerald-400',
      'bg-blue-600': 'text-blue-600 dark:text-blue-400',
      'bg-purple-600': 'text-purple-600 dark:text-purple-400',
      'bg-orange-600': 'text-orange-600 dark:text-orange-400',
      'bg-yellow-600': 'text-yellow-600 dark:text-yellow-400'
    }
    return colorMap[colorClass]
  }

  // Sample domain apps for demonstration
  const sampleDomainApps = [
    {
      id: 'healthcare',
      name: 'Healthcare',
      description: 'Patient journey analysis, medical records, and treatment pathways',
      icon: <Activity className="h-8 w-8" />,
      path: '/domain/healthcare',
      enabled: true,
      status: 'active',
      color: 'bg-red-500/10 dark:bg-red-500/20',
      iconColor: 'text-red-600 dark:text-red-400',
      features: ['Patient Journey Mapping', 'Treatment Analysis', 'Outcome Prediction']
    },
    {
      id: 'financial',
      name: 'Financial Services',
      description: 'Transaction analysis, fraud detection, and risk assessment',
      icon: <ChartBar className="h-8 w-8" />,
      path: '/domain-apps/financial',
      enabled: false,
      status: 'coming-soon',
      color: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      features: ['Risk Assessment', 'Fraud Detection', 'Portfolio Analysis']
    },
    {
      id: 'legal',
      name: 'Legal Research',
      description: 'Case analysis, document review, and legal research',
      icon: <FileText className="h-8 w-8" />,
      path: '/domain-apps/legal',
      enabled: false,
      status: 'coming-soon',
      color: 'bg-blue-500/10 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      features: ['Document Analysis', 'Case Mapping', 'Legal Research']
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
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 bg-muted rounded-xl" />
                      <div className="w-20 h-5 bg-muted rounded" />
                    </div>
                    <div className="w-32 h-6 bg-muted rounded" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="w-full h-4 bg-muted rounded" />
                    <div className="w-3/4 h-4 bg-muted rounded" />
                  </CardContent>
                  <CardFooter>
                    <div className="w-full h-10 bg-muted rounded" />
                  </CardFooter>
                </Card>
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
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <PageHeader
          title="Domain Applications"
          description="Specialized applications for different industries and use cases"
          icon={<BarChart3 className="h-6 w-6" />}
          actions={
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" className="shadow-sm">
                Request Custom App
              </Button>
            </div>
          }
        />

        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 space-y-8">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-destructive">{error}</p>
              </div>
            )}

            {/* Domain Apps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayApps.map((domain) => (
                <Card key={domain.id} className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-border/50 hover:border-primary/20 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${domain.color} transition-transform group-hover:scale-110 duration-300`}>
                        <div className={domain.iconColor}>
                          {domain.icon}
                        </div>
                      </div>
                      <StatusIndicator 
                        status={domain.enabled ? 'success' : 'pending'} 
                        label={domain.enabled ? 'Active' : 'Coming Soon'}
                        size="sm"
                      />
                    </div>
                    <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors duration-200">
                      {domain.name}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4 pb-6">
                    <CardDescription className="text-muted-foreground leading-relaxed text-sm">
                      {domain.description}
                    </CardDescription>
                    
                    {domain.features && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground">Key Features:</h4>
                        <ul className="text-sm text-muted-foreground space-y-2">
                          {domain.features.map((feature: string, index: number) => (
                            <li key={index} className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-primary/60 rounded-full flex-shrink-0" />
                              <span className="leading-relaxed">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-0">
                    {domain.enabled ? (
                      <Link href={domain.path} className="w-full">
                        <Button className="w-full group-hover:shadow-md transition-all duration-200 bg-primary hover:bg-primary/90">
                          Open Application
                          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="secondary" className="w-full" disabled>
                        <Loader2 className="h-4 w-4 mr-2" />
                        Coming Soon
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Custom Domain App CTA */}
            <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-secondary/5 dark:from-primary/10 dark:via-primary/5 dark:to-secondary/10 border-primary/20 shadow-lg">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg">
                    <Zap className="h-10 w-10 text-primary-foreground" />
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-3">
                    <h3 className="text-2xl font-bold text-foreground">
                      Need a Custom Domain Application?
                    </h3>
                    <p className="text-muted-foreground leading-relaxed max-w-2xl">
                      We can build specialized graph visualization applications tailored to your industry or specific use case. 
                      Get in touch to discuss your requirements and bring your data to life with custom graph analytics.
                    </p>
                  </div>
                  <Button className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200">
                    Contact Our Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
