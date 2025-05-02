'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Activity, FileText, Building, Brain, ChartBar, ArrowRight, Database, Network } from 'lucide-react'

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

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Domain Applications</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-400 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-400 rounded"></div>
                <div className="h-4 bg-gray-400 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Domain Applications</h1>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-lg font-medium">{error}</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Domain Applications</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {domainApps.map((domain) => (
          <Card key={domain.id} className="overflow-hidden">
            <CardHeader className={`text-white ${domain.color}`}>
              <div className="flex items-center gap-2">
                <domain.icon className="h-6 w-6" />
                <CardTitle>{domain.title}</CardTitle>
              </div>
              <CardDescription className="text-white/80">
                {domain.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {domain.apps.map((app: any) => (
                  <div key={app.id} className="flex items-start gap-4">
                    <div className={`p-2 rounded-md ${domain.color} bg-opacity-10 text-${domain.color.split('-')[1]}-600`}>
                      <app.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">{app.title}</h3>
                      <p className="text-sm text-muted-foreground">{app.description}</p>
                      {app.comingSoon ? (
                        <span className="inline-flex items-center mt-2 rounded-full bg-gray-100 px-2 py-1 text-xs">
                          Coming Soon
                        </span>
                      ) : (
                        <Link href={app.path} className="inline-flex items-center mt-2 text-sm font-medium text-primary hover:underline">
                          Open App <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gray-50 border-dashed">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Database className="h-6 w-6" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-medium">Need a Custom Domain Application?</h3>
              <p className="text-muted-foreground">
                We can build specialized graph visualization applications for your industry or use case.
              </p>
            </div>
            <Button variant="outline">
              Contact Us
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
