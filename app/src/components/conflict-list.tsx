import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, AlertCircle, CheckCircle2, Filter, SortAsc, SortDesc } from 'lucide-react'
import { type ConflictListItem, type ConflictListFilters, type ConflictListResponse } from '@/types/merge'
import { cn } from '@/lib/utils'

interface ConflictListProps {
  mergeId: string
  onConflictSelect: (conflict: ConflictListItem) => void
  selectedConflicts: string[]
  onSelectionChange: (selectedIds: string[]) => void
}

const severityColors = {
  critical: 'text-red-600 bg-red-50 border-red-200',
  major: 'text-orange-600 bg-orange-50 border-orange-200',
  minor: 'text-yellow-600 bg-yellow-50 border-yellow-200'
}

const defaultFilters: ConflictListFilters = {
  limit: 10,
  offset: 0,
  sort_by: 'detected_at',
  sort_order: 'desc'
}

export function ConflictList({
  mergeId,
  onConflictSelect,
  selectedConflicts,
  onSelectionChange
}: ConflictListProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ConflictListResponse | null>(null)
  const [filters, setFilters] = useState<ConflictListFilters>(defaultFilters)
  const [searchQuery, setSearchQuery] = useState('')

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

      const response = await fetch(`/api/v1/merge/conflicts/${mergeId}?${queryParams.toString()}`)
      
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

  const summary = useMemo(() => {
    if (!data?.summary) return null

    const byStatus = data.summary.by_status || {}
    const bySeverity = data.summary.by_severity || {}

    return {
      total: data.summary.total || 0,
      resolved: (byStatus['auto-resolved'] || 0) + (byStatus['manually-resolved'] || 0),
      unresolved: byStatus['unresolved'] || 0,
      bySeverity
    }
  }, [data])

  return (
    <div className="h-full flex flex-col">
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
              onChange={(e) => setSearchQuery(e.target.value)}
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
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-gray-600">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchConflicts}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : data?.conflicts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-gray-600">No conflicts found</p>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="pb-4">
                    <Checkbox
                      checked={selectedConflicts.length === data?.conflicts.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th 
                    className="pb-4 cursor-pointer"
                    onClick={() => handleSort('detected_at')}
                  >
                    <div className="flex items-center gap-2">
                      Time
                      {filters.sort_by === 'detected_at' && (
                        filters.sort_order === 'asc' ? (
                          <SortAsc className="h-4 w-4" />
                        ) : (
                          <SortDesc className="h-4 w-4" />
                        )
                      )}
                    </div>
                  </th>
                  <th className="pb-4">Type</th>
                  <th className="pb-4">Severity</th>
                  <th className="pb-4">Description</th>
                  <th className="pb-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.conflicts.map((conflict) => (
                  <tr
                    key={conflict.id}
                    className={cn(
                      'border-t hover:bg-gray-50 cursor-pointer',
                      selectedConflicts.includes(conflict.id) && 'bg-blue-50'
                    )}
                    onClick={() => onConflictSelect(conflict)}
                  >
                    <td className="py-4">
                      <Checkbox
                        checked={selectedConflicts.includes(conflict.id)}
                        onCheckedChange={(checked) => handleConflictSelect(conflict.id, !!checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="py-4 text-sm text-gray-600">
                      {new Date(conflict.detected_at).toLocaleString()}
                    </td>
                    <td className="py-4">
                      <Badge variant="outline">{conflict.conflict_type}</Badge>
                    </td>
                    <td className="py-4">
                      <Badge className={severityColors[conflict.severity.level]}>
                        {conflict.severity.label}
                      </Badge>
                    </td>
                    <td className="py-4 text-sm">{conflict.description}</td>
                    <td className="py-4">
                      <Badge
                        variant={conflict.resolution_status === 'unresolved' ? 'destructive' : 'default'}
                        className={cn(
                          conflict.resolution_status === 'auto-resolved' && 'bg-green-500',
                          conflict.resolution_status === 'manually-resolved' && 'bg-blue-500'
                        )}
                      >
                        {conflict.resolution_status.replace('-', ' ')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ScrollArea>

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