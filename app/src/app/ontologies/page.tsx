'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  FileText, 
  Edit,
  Play,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  Clock
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[OntologiesPage]', ...args)
  }
}

interface Ontology {
  id: string
  name: string
  file_name: string
  version: number
  source?: string
  created_at: string
  updated_at: string
  metadata?: any
}

export default function OntologiesPage() {
  const [ontologies, setOntologies] = useState<Ontology[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredOntologies, setFilteredOntologies] = useState<Ontology[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { user } = useUser()

  // Fetch ontologies
  useEffect(() => {
    const fetchOntologies = async () => {
      try {
        setError(null)
        const response = await fetch('/api/v1/ontologies')
        if (response.ok) {
          const data = await response.json()
          debug('Fetched ontologies:', data)
          setOntologies(data.ontologies || [])
          setFilteredOntologies(data.ontologies || [])
        } else {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || `Failed to fetch ontologies (${response.status})`
          setError(errorMessage)
          console.error('Failed to fetch ontologies:', errorMessage)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        setError(errorMessage)
        console.error('Error fetching ontologies:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      fetchOntologies()
    } else {
      setLoading(false)
    }
  }, [user?.id])

  // Filter ontologies based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredOntologies(ontologies)
    } else {
      const filtered = ontologies.filter(ontology =>
        ontology.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ontology.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ontology.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredOntologies(filtered)
    }
  }, [searchQuery, ontologies])

  const handleUseOntology = (ontologyId: string) => {
    // Navigate to ontology page with the specific ontology loaded for use
    router.push(`/ontology?id=${ontologyId}`)
  }

  const handleDeleteOntology = async (ontologyId: string) => {
    if (!confirm('Are you sure you want to delete this ontology? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/v1/ontology/${ontologyId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove the deleted ontology from the list
        setOntologies(prev => prev.filter(ont => ont.id !== ontologyId))
        setFilteredOntologies(prev => prev.filter(ont => ont.id !== ontologyId))
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.detail || errorData.error || 'Failed to delete ontology'
        setError(errorMessage)
        console.error('Failed to delete ontology:', errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error deleting ontology:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSourceBadge = (source?: string) => {
    if (source === 'file') {
      return <Badge variant="outline" className="text-xs">File System</Badge>
    }
    return <Badge variant="default" className="text-xs">Database</Badge>
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Database className="h-8 w-8 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading ontologies...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        <PageHeader
          title="Ontology Library"
          description="Manage and organize your knowledge graph ontologies"
          icon={<Database className="h-6 w-6" />}
          actions={
            <div className="flex items-center space-x-3">
              <Link href="/ontology">
                <Button variant="cta" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </Button>
              </Link>
            </div>
          }
        />

        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="text-destructive font-medium">Error loading ontologies</div>
              </div>
              <div className="text-sm text-destructive/80 mt-1">{error}</div>
              <button 
                onClick={() => window.location.reload()} 
                className="text-sm text-destructive hover:underline mt-2"
              >
                Try again
              </button>
            </div>
          )}

          {/* Search and Filter */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ontologies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredOntologies.length} of {ontologies.length} ontologies
            </div>
          </div>

          {/* Ontologies Grid */}
          {filteredOntologies.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">
                  {ontologies.length === 0 ? 'No ontologies found' : 'No matching ontologies'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {ontologies.length === 0 
                    ? 'Create your first ontology to define the structure of your knowledge graph.'
                    : 'Try adjusting your search terms or create a new ontology.'
                  }
                </p>
                <Link href="/ontology">
                  <Button variant="cta">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Ontology
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOntologies.map((ontology) => (
                <Card key={ontology.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-medium truncate group-hover:text-primary transition-colors">
                          {ontology.name || ontology.file_name.replace('.yaml', '')}
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                          ID: {ontology.id}
                        </CardDescription>
                      </div>
                      {getSourceBadge(ontology.source)}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Metadata */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Version {ontology.version}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Updated: {formatDate(ontology.updated_at)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created: {formatDate(ontology.created_at)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteOntology(ontology.id)}
                        className="flex-1"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="cta"
                        className="flex-1"
                        onClick={() => handleUseOntology(ontology.id)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Use
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 
