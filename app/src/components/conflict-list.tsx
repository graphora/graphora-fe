import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, AlertCircle, CheckCircle2, Filter, SortAsc, SortDesc, Wand2 } from 'lucide-react'
import { type ConflictListItem, type ConflictListFilters, type ConflictListResponse } from '@/types/merge'
import { cn } from '@/lib/utils'
import { ConflictDetailsView } from '@/components/conflict-details-view'
import { AutoResolvePanel } from '@/components/auto-resolve-panel'

interface ConflictListProps {
  mergeId: string
  onConflictSelect: (conflict: ConflictListItem) => void
  selectedConflicts: string[]
  onSelectionChange: (selectedIds: string[]) => void
  onAutoResolveComplete?: () => void
  className?: string
}

const severityColors = {
  critical: 'text-red-600 bg-red-50 border-red-200',
  major: 'text-orange-600 bg-orange-50 border-orange-200',
  minor: 'text-yellow-600 bg-yellow-50 border-yellow-200'
}

const defaultFilters: ConflictListFilters = {
  limit: 10,
  offset: 0,
  sort_by: 'created_at',
  sort_order: 'desc'
}

export function ConflictList({
  mergeId,
  onConflictSelect,
  selectedConflicts,
  onSelectionChange,
  onAutoResolveComplete,
  className
}: ConflictListProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ConflictListResponse | null>(null)
  const [filters, setFilters] = useState<ConflictListFilters>(defaultFilters)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConflictForDetails, setSelectedConflictForDetails] = useState<ConflictListItem | null>(null)

  const fetchConflicts = async () => {
    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v))
        } else if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })

      if (searchQuery) {
        queryParams.append('search', searchQuery)
      }

      const response = await fetch(`/api/merge/${mergeId}/conflicts?${queryParams.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch conflicts')
      }

      const data = await response.json()
      setData(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConflicts()
  }, [mergeId, filters, searchQuery])

  const handleFilterChange = (key: keyof ConflictListFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0
    }))
  }

  const handleSort = (field: string) => {
    setFilters(prev => ({
      ...prev,
      sort_by: field,
      sort_order: prev.sort_by === field && prev.sort_order === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      onSelectionChange(data.conflicts.map(c => c.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleConflictSelect = (conflictId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedConflicts, conflictId])
    } else {
      onSelectionChange(selectedConflicts.filter(id => id !== conflictId))
    }
  }

  const handleConflictClick = (conflict: ConflictListItem) => {
    setSelectedConflictForDetails(conflict)
    onConflictSelect(conflict)
  }

  const handleBackToList = () => {
    setSelectedConflictForDetails(null)
  }

  const handleNextConflict = () => {
    if (!data?.conflicts || data.conflicts.length <= 1) return
    
    const currentIndex = data.conflicts.findIndex(c => c.id === selectedConflictForDetails?.id)
    if (currentIndex === -1 || currentIndex === data.conflicts.length - 1) {
      handleBackToList()
    } else {
      setSelectedConflictForDetails(data.conflicts[currentIndex + 1])
    }
  }

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value)
  }

  const summary = useMemo(() => {
    if (!data?.summary) return null
    const bySeverity = data.summary.by_severity || {}
    return {
      total: data.summary.total || 0,
      resolved: data.summary.resolved || 0,
      unresolved: data.summary.unresolved || 0,
      bySeverity: {
        critical: bySeverity['critical'] || 0,
        major: bySeverity['major'] || 0,
        minor: bySeverity['minor'] || 0
      }
    }
  }, [data])

  const handleAutoResolveComplete = () => {
    fetchConflicts()
    if (onAutoResolveComplete) {
      onAutoResolveComplete()
    }
  }

  return (
    <div className={cn("min-h-screen flex flex-col", className)}>
      {/* Top Area: Auto-Resolve Panel */}
      {summary && (
        <div className="p-2 border-b bg-white">
          <AutoResolvePanel
            mergeId={mergeId}
            conflictSummary={{ total: summary.total, by_severity: summary.bySeverity }}
            onResolutionComplete={handleAutoResolveComplete}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col md:flex-row">
        {/* Left Side: Conflict List */}
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r bg-white">
          {/* Filters */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="Search conflicts..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="max-w-sm border-gray-300 rounded"
              />
              <Select
                value={filters.conflict_type?.[0]}
                onValueChange={(value) => handleFilterChange('conflict_type', [value])}
              >
                <SelectTrigger className="w-[140px] border-gray-300 rounded">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {data?.summary.by_type && Object.keys(data.summary.by_type).map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.severity?.[0]}
                onValueChange={(value) => handleFilterChange('severity', [value])}
              >
                <SelectTrigger className="w-[140px] border-gray-300 rounded">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFilters(defaultFilters)}
                className="border-gray-300 rounded"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Conflict List */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-500">{error}</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={fetchConflicts}>Retry</Button>
                </div>
              </div>
            ) : data?.conflicts.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500">No conflicts found</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedConflicts.length === data?.conflicts.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-xs">{selectedConflicts.length} selected</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('severity')}>
                      {filters.sort_by === 'severity' && (filters.sort_order === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />)}
                    </Button>
                  </div>
                </div>
                {data?.conflicts.map(conflict => (
                  <Card
                    key={conflict.id}
                    className={cn(
                      "cursor-pointer hover:bg-gray-50 transition-colors",
                      selectedConflictForDetails?.id === conflict.id && "bg-gray-100 border-primary"
                    )}
                    onClick={() => handleConflictClick(conflict)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={selectedConflicts.includes(conflict.id)}
                          onCheckedChange={(checked) => handleConflictSelect(conflict.id, !!checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {conflict.entity_name || conflict.entity_id}
                            </span>
                            <Badge className={cn(severityColors[conflict.severity], 'rounded-full text-xs')}>
                              {conflict.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{conflict.description}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>{new Date(conflict.created_at).toLocaleDateString()}</span>
                            {conflict.resolution_status === 'auto-resolved' && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 rounded-full text-xs">
                                <Wand2 className="h-3 w-3 mr-1" />
                                Auto
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {data && data.total_count > filters.limit! && (
            <div className="p-2 border-t">
              <div className="flex items-center justify-between text-xs">
                <span>
                  {filters.offset! + 1} - {Math.min(filters.offset! + filters.limit!, data.total_count)} of {data.total_count}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.offset === 0}
                    onClick={() => handleFilterChange('offset', Math.max(0, filters.offset! - filters.limit!))}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.offset! + filters.limit! >= data.total_count}
                    onClick={() => handleFilterChange('offset', filters.offset! + filters.limit!)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Conflict Details */}
        <div className="w-full md:w-2/3 bg-white">
          {selectedConflictForDetails ? (
            <ConflictDetailsView
              mergeId={mergeId}
              conflict={selectedConflictForDetails}
              onBack={handleBackToList}
              onNext={data?.conflicts && data.conflicts.length > 1 ? handleNextConflict : undefined}
              onResolve={(resolution) => {
                if (data) {
                  const updatedConflicts = data.conflicts.map(c => 
                    c.id === selectedConflictForDetails.id
                      ? { ...c, resolution_status: 'manually-resolved' }
                      : c
                  )
                  setData({ ...data, conflicts: updatedConflicts })
                }
                onSelectionChange(selectedConflicts.filter(id => id !== selectedConflictForDetails.id))
                handleNextConflict()
              }}
            />
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p>Select a conflict from the list to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}