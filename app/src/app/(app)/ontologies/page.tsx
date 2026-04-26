'use client'

import React, { useState, useEffect } from 'react'
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
  Clock,
  LayoutTemplate
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useAuth'

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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Database className="h-8 w-8 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading ontologies...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div style={{ padding: '28px 32px 0' }}>
          <PageHeader
            kicker="Workspace · ontology library"
            title="Ontology library"
            description="Manage and organize your knowledge graph ontologies."
            actions={
              <Link href="/ontology">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-[13px] w-[13px]" />
                  New ontology
                </Button>
              </Link>
            }
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-6" style={{ padding: '20px 32px 40px', maxWidth: 1600 }}>
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
            <div
              className="text-center"
              style={{
                background: 'var(--bg-elev)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-md)',
                padding: '48px 24px',
              }}
            >
              <Database className="h-10 w-10 mx-auto mb-4" style={{ color: 'var(--fg-muted)' }} />
              <div className="gx-kicker" style={{ marginBottom: 6 }}>
                {ontologies.length === 0 ? 'Empty library' : 'No matches'}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)', letterSpacing: '-0.01em', margin: 0 }}>
                {ontologies.length === 0 ? 'No ontologies yet' : 'No matching ontologies'}
              </h3>
              <p style={{ color: 'var(--fg-muted)', fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
                {ontologies.length === 0
                  ? 'Create your first ontology to define the structure of your knowledge graph.'
                  : 'Try adjusting your search terms or create a new ontology.'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4">
                <Link href="/ontology">
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-[13px] w-[13px]" />
                    Create from scratch
                  </Button>
                </Link>
                {ontologies.length === 0 && (
                  <Link href="/ontology?templates=true">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <LayoutTemplate className="h-[13px] w-[13px]" />
                      Browse templates
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOntologies.map((ontology) => (
                <div
                  key={ontology.id}
                  className="group cursor-pointer transition-colors"
                  style={{
                    background: 'var(--bg-elev)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-md)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3
                          className="truncate group-hover:text-[color:var(--gx-accent)] transition-colors"
                          style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--fg)', letterSpacing: '-0.01em', margin: 0 }}
                        >
                          {ontology.name || ontology.file_name.replace('.yaml', '')}
                        </h3>
                        <div className="gx-mono mt-1" style={{ fontSize: 11, color: 'var(--fg-faint)' }}>
                          {ontology.id.slice(0, 8)}
                        </div>
                      </div>
                      {getSourceBadge(ontology.source)}
                    </div>
                  </div>

                  <div style={{ padding: 16 }} className="space-y-4">
                    {/* Metadata */}
                    <div className="gx-mlist" style={{ fontSize: 11.5 }}>
                      <div className="flex items-center gap-2" style={{ padding: '2px 0' }}>
                        <Clock className="h-[12px] w-[12px]" style={{ color: 'var(--fg-muted)' }} />
                        <span className="k">version</span>
                        <span className="v">{ontology.version}</span>
                      </div>
                      <div className="flex items-center gap-2" style={{ padding: '2px 0' }}>
                        <span className="k" style={{ paddingLeft: 18 }}>updated</span>
                        <span className="v">{formatDate(ontology.updated_at)}</span>
                      </div>
                      <div className="flex items-center gap-2" style={{ padding: '2px 0' }}>
                        <span className="k" style={{ paddingLeft: 18 }}>created</span>
                        <span className="v">{formatDate(ontology.created_at)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteOntology(ontology.id)}
                        className="flex-1 gap-1"
                      >
                        <Trash2 className="h-[13px] w-[13px]" />
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="cta"
                        className="flex-1 gap-1"
                        onClick={() => handleUseOntology(ontology.id)}
                      >
                        <Play className="h-[13px] w-[13px]" />
                        Use
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  )
}
