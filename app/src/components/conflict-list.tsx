import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      offset: 0 // Reset pagination when filters change
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
      // If current conflict is the last one or not found, go back to list
      handleBackToList()
    } else {
      // Move to next conflict
      setSelectedConflictForDetails(data.conflicts[currentIndex + 1])
    }
  }

  // Handle search input
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

  // Calculate the resolved and unresolved counts
  const resolvedCount = data?.summary?.resolved || 0
  const unresolvedCount = data?.summary?.unresolved || 0
  const totalCount = data?.summary?.total || 0
  
  // Calculate progress percentage
  const progressPercentage = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0

  if (selectedConflictForDetails) {
    return (
      <ConflictDetailsView
        mergeId={mergeId}
        conflict={selectedConflictForDetails}
        onBack={handleBackToList}
        onNext={data?.conflicts && data.conflicts.length > 1 ? handleNextConflict : undefined}
        onResolve={(resolution) => {
          // Update local state to reflect resolution
          if (data) {
            const updatedConflicts = data.conflicts.map(c => 
              c.id === selectedConflictForDetails.id
                ? { ...c, resolution_status: 'manually-resolved' as const }
                : c
            )
            setData({ ...data, conflicts: updatedConflicts })
          }
          // Remove from selected conflicts
          onSelectionChange(selectedConflicts.filter(id => id !== selectedConflictForDetails.id))
          // Move to next conflict if available
          handleNextConflict()
        }}
      />
    )
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Auto-Resolve Panel */}
      {summary && (
        <div className="p-4 border-b">
          <AutoResolvePanel
            mergeId={mergeId}
            conflictSummary={{
              total: summary.total,
              by_severity: summary.bySeverity
            }}
            onResolutionComplete={handleAutoResolveComplete}
          />
        </div>
      )}

      {/* Summary Header */}
      {summary && (
        <div className="p-4 border-b">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-gray-500">Total Conflicts</div>
                <div className="text-2xl font-bold mt-1">{summary.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-gray-500">Resolved</div>
                <div className="text-2xl font-bold mt-1 text-green-600">{summary.resolved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-gray-500">Unresolved</div>
                <div className="text-2xl font-bold mt-1 text-orange-600">{summary.unresolved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-gray-500">Critical</div>
                <div className="text-2xl font-bold mt-1 text-red-600">
                  {summary.bySeverity.critical || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search conflicts..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="max-w-sm"
            />
          </div>
          <Select
            value={filters.conflict_type?.[0]}
            onValueChange={(value) => handleFilterChange('conflict_type', [value])}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {data?.summary.by_type && Object.keys(data.summary.by_type).map(type => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.severity?.[0]}
            onValueChange={(value) => handleFilterChange('severity', [value])}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.resolution_status?.[0]}
            onValueChange={(value) => handleFilterChange('resolution_status', [value])}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unresolved">Unresolved</SelectItem>
              <SelectItem value="auto-resolved">Auto-resolved</SelectItem>
              <SelectItem value="manually-resolved">Manually resolved</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFilters(defaultFilters)}
            className="ml-2"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Conflict List */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-500">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={fetchConflicts}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : data?.conflicts.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-gray-500">No conflicts found</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedConflicts.length === data?.conflicts.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedConflicts.length} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('created_at')}
                    className="gap-1"
                  >
                    Date
                    {filters.sort_by === 'created_at' && (
                      filters.sort_order === 'asc' ? (
                        <SortAsc className="h-4 w-4" />
                      ) : (
                        <SortDesc className="h-4 w-4" />
                      )
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('severity')}
                    className="gap-1"
                  >
                    Severity
                    {filters.sort_by === 'severity' && (
                      filters.sort_order === 'asc' ? (
                        <SortAsc className="h-4 w-4" />
                      ) : (
                        <SortDesc className="h-4 w-4" />
                      )
                    )}
                  </Button>
                </div>
              </div>
              {data?.conflicts.map(conflict => (
                <Card
                  key={conflict.id}
                  className={cn(
                    "cursor-pointer hover:bg-gray-50 transition-colors",
                    selectedConflicts.includes(conflict.id) && "border-primary"
                  )}
                  onClick={() => handleConflictClick(conflict)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedConflicts.includes(conflict.id)}
                        onCheckedChange={(checked) => {
                          handleConflictSelect(conflict.id, !!checked)
                          // Prevent propagation using a separate onClick handler
                        }}
                        onClick={(event) => {
                          event.stopPropagation()
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">
                            {conflict.entity_name || conflict.entity_id}
                          </span>
                          <Badge
                            className={cn(
                              severityColors[conflict.severity] || 'bg-gray-100'
                            )}
                          >
                            {conflict.severity}
                          </Badge>
                          <Badge variant="outline">
                            {conflict.conflict_type}
                          </Badge>
                          {conflict.resolution_status === 'auto-resolved' && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              <Wand2 className="h-3 w-3 mr-1" />
                              Auto-resolved
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {conflict.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>
                            Detected: {new Date(conflict.created_at).toLocaleString()}
                          </span>
                          {conflict.resolved && (
                            <span className="flex items-center text-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Resolved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Pagination */}
      {data && data.total_count > filters.limit! && (
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filters.offset! + 1} to {Math.min(filters.offset! + filters.limit!, data.total_count)} of {data.total_count} conflicts
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.offset === 0}
                onClick={() => handleFilterChange('offset', Math.max(0, filters.offset! - filters.limit!))}
              >
                Previous
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
  )
} 