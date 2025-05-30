import { useState, useEffect, useMemo, useRef } from 'react'
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
import { MergeCompletionBanner } from './merge-completion-banner'
import { ChangeLog } from '@/types/merge'

interface ConflictListProps {
  mergeId: string
  onConflictSelect: (conflict: ConflictListItem) => void
  selectedConflicts: string[]
  onSelectionChange: (selectedIds: string[]) => void
  onAutoResolveComplete?: () => void
  className?: string
  onViewMergedResults?: () => void
  onViewFinalGraph?: () => void
}

const severityColors = {
  critical: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/50',
  major: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800/50',
  minor: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800/50',
  info: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800/50'
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
  onViewMergedResults,
  onViewFinalGraph = () => {},
  className
}: ConflictListProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<ChangeLog[]>([])
  const [convertedConflicts, setConvertedConflicts] = useState<ConflictListItem[]>([])
  const [filters, setFilters] = useState<ConflictListFilters>(defaultFilters)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConflictForDetails, setSelectedConflictForDetails] = useState<ConflictListItem | null>(null)
  const [leftWidth, setLeftWidth] = useState(33)
  const containerRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)
  const [conflictTypes, setConflictTypes] = useState<string[]>([])
  const [allResolved, setAllResolved] = useState(false)

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

      const response = await fetch(`/api/merge/merges/${mergeId}/conflicts?${queryParams.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch conflicts')
      }

      // The new API returns an array of ChangeLog objects
      const data = await response.json()
      
      // Handle both array format and old format for backward compatibility
      if (Array.isArray(data)) {
        setConflicts(data)
        
        // Convert ChangeLog objects to ConflictListItems for compatibility with existing code
        const convertedItems = data.map((conflict: ChangeLog) => convertChangeLogToConflictItem(conflict))
        setConvertedConflicts(convertedItems)
        
        // Extract unique conflict types
        const types = [...new Set(convertedItems.map(item => item.conflict_type))]
        setConflictTypes(types)
        
        // Check if all conflicts are resolved (for now, we'll assume none are resolved in the new format)
        setAllResolved(false)
      } else {
        // Handle old format
        setConvertedConflicts(data.conflicts || [])
        if (data.summary) {
          const types = data.summary.by_type ? Object.keys(data.summary.by_type) : []
          setConflictTypes(types)
          setAllResolved(data.summary.unresolved === 0 && data.summary.total > 0)
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Function to convert ChangeLog to ConflictListItem
  const convertChangeLogToConflictItem = (changeLog: ChangeLog): ConflictListItem => {
    // Determine the severity based on the number of property changes
    const propCount = Object.keys(changeLog.prop_changes).length;
    const severity = propCount > 5 ? 'critical' : propCount > 2 ? 'major' : 'minor';
  
    return {
      id: changeLog.id,
      merge_id: mergeId,
      entity_id: changeLog.staging_node.id,
      entity_name: changeLog.staging_node.properties.name || changeLog.staging_node.id,
      entity_type: changeLog.staging_node.type,
      conflict_type: 'property_conflict', // Default type
      severity: {
        level: severity as 'critical' | 'major' | 'minor' | 'info',
        label: severity.charAt(0).toUpperCase() + severity.slice(1),
        color: severity === 'critical' ? 'red' : severity === 'major' ? 'orange' : 'yellow'
      },
      description: `${Object.keys(changeLog.prop_changes).length} properties have conflicting values`,
      resolved: false,
      resolution_status: 'unresolved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Store the original changelog data to use in conflict resolution
      raw_changelog: changeLog
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
    if (checked) {
      onSelectionChange(convertedConflicts.map(c => c.id))
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
    if (convertedConflicts.length <= 1) return
    
    const currentIndex = convertedConflicts.findIndex(c => c.id === selectedConflictForDetails?.id)
    if (currentIndex === -1 || currentIndex === convertedConflicts.length - 1) {
      handleBackToList()
    } else {
      setSelectedConflictForDetails(convertedConflicts[currentIndex + 1])
    }
    fetchConflicts()
  }

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value)
  }

  const summary = useMemo(() => {
    // Create a summary from the converted conflicts
    const total = convertedConflicts.length
    const resolved = convertedConflicts.filter(c => c.resolved).length
    
    // Count by severity
    const bySeverity = {
      critical: convertedConflicts.filter(c => c.severity.level === 'critical').length,
      major: convertedConflicts.filter(c => c.severity.level === 'major').length,
      minor: convertedConflicts.filter(c => c.severity.level === 'minor').length,
      info: convertedConflicts.filter(c => c.severity.level === 'info').length
    }
    
    return {
      total,
      resolved,
      unresolved: total - resolved,
      bySeverity
    }
  }, [convertedConflicts])

  const handleAutoResolveComplete = () => {
    fetchConflicts()
    if (onAutoResolveComplete) {
      onAutoResolveComplete()
    }
  }

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', stopResizing)
  }

  const handleResize = (e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
    setLeftWidth(Math.max(20, Math.min(80, newWidth)))
  }

  const stopResizing = () => {
    isResizing.current = false
    document.body.style.cursor = 'default'
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResizing)
  }

  return (
    <div className={cn("h-screen flex flex-col", className)}>
      {summary?.unresolved === 0 && summary?.total > 0 && (
        <div className="p-2 border-b bg-background">
          <MergeCompletionBanner
            mergeId={mergeId}
            onViewFinalGraph={onViewFinalGraph}
            onViewProgress={() => {}}
            takeToFinalize={false}
          />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden" ref={containerRef}>
        <div 
          className="relative bg-background border-r border-border"
          style={{ width: `${leftWidth}%` }}
        >
          <div className="h-full flex flex-col">
            {/* Filters - Fixed at top */}
            <div className="p-4 border-b border-border bg-background shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  placeholder="Search conflicts..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="max-w-sm"
                />
                {conflictTypes.length > 0 && (
                  <Select
                    value={filters.conflict_type?.[0]}
                    onValueChange={(value) => handleFilterChange('conflict_type', [value])}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {conflictTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select
                  value={filters.severity?.[0]}
                  onValueChange={(value) => handleFilterChange('severity', [value])}
                >
                  <SelectTrigger className="w-[140px] border-border rounded">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setFilters(defaultFilters)}
                  className="border-border rounded"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-hidden pb-8">
              <ScrollArea className="h-full pb-32">
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
                  ) : convertedConflicts.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-muted-foreground">No conflicts found</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedConflicts.length === convertedConflicts.length}
                            onCheckedChange={handleSelectAll}
                          />
                          <span className="text-xs text-muted-foreground">{selectedConflicts.length} selected</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('severity')}>
                            {filters.sort_by === 'severity' && (filters.sort_order === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />)}
                          </Button>
                        </div>
                      </div>
                      {convertedConflicts.map(conflict => (
                        <Card
                          key={conflict.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50 transition-colors",
                            selectedConflictForDetails?.id === conflict.id && "bg-muted border-primary"
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
                                  <span className="font-medium text-sm truncate text-foreground">
                                    {conflict.entity_name || conflict.entity_id}
                                  </span>
                                  <Badge className={cn(severityColors[conflict.severity.level], 'rounded-full text-xs')}>
                                    {conflict.severity.level}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{conflict.description}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <span>{new Date(conflict.created_at).toLocaleDateString()}</span>
                                  {conflict.resolution_status === 'auto-resolved' && (
                                    <Badge className="bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/50 rounded-full text-xs">
                                      <Wand2 className="h-3 w-3 mr-1" />
                                      Auto
                                    </Badge>
                                  )}
                                  {conflict.resolved && (
                                    <span className="flex items-center text-green-600 dark:text-green-400">
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
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Pagination - Fixed at bottom */}
            {convertedConflicts.length >= filters.limit! && (
              <div className="p-2 border-t bg-background shrink-0">
                <div className="flex items-center justify-between text-xs">
                  <span>
                    {filters.offset! + 1} - {Math.min(filters.offset! + filters.limit!, convertedConflicts.length)} of {convertedConflicts.length}
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
                      disabled={filters.offset! + filters.limit! >= convertedConflicts.length}
                      onClick={() => handleFilterChange('offset', filters.offset! + filters.limit!)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            className="absolute right-0 top-0 bottom-0 w-1 bg-border hover:bg-border/80 cursor-col-resize"
            onMouseDown={startResizing}
          />
        </div>

        <div 
          className="bg-background flex-1 overflow-auto"
          style={{ width: `${100 - leftWidth}%` }}
        >
          {selectedConflictForDetails ? (
            <ConflictDetailsView
              mergeId={mergeId}
              conflict={selectedConflictForDetails}
              canSubmit={selectedConflictForDetails.severity.level !== 'info'}
              onViewMergedResults={onViewMergedResults}
              onViewFinalGraph={onViewFinalGraph}
              onBack={handleBackToList}
              onNext={convertedConflicts.length > 1 ? handleNextConflict : undefined}
              onResolve={(resolution) => {
                // Mark the conflict as resolved
                const updatedConflicts = convertedConflicts.map(c => 
                  c.id === selectedConflictForDetails.id
                    ? { ...c, resolution_status: 'manually-resolved' as const, resolved: true }
                    : c
                )
                setConvertedConflicts(updatedConflicts)
                onSelectionChange(selectedConflicts.filter(id => id !== selectedConflictForDetails.id))
                handleNextConflict()
              }}
            />
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <p>Select a conflict from the list to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}