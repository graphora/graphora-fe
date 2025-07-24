'use client'

import React, { useState, useMemo } from 'react'
import { 
  AlertTriangle, 
  XCircle, 
  Info, 
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { type QualityViolation, type QualitySeverity, type QualityRuleType } from '@/types/quality'

interface ViolationsTableProps {
  violations: QualityViolation[];
  transformId: string;
  className?: string;
}

export function ViolationsTable({ violations, transformId, className = '' }: ViolationsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filter and search violations
  const filteredViolations = useMemo(() => {
    return violations.filter(violation => {
      const matchesSearch = searchTerm === '' || 
        violation.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        violation.entity_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        violation.property_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSeverity = severityFilter === 'all' || violation.severity === severityFilter;
      const matchesType = typeFilter === 'all' || violation.rule_type === typeFilter;
      const matchesEntityType = entityTypeFilter === 'all' || violation.entity_type === entityTypeFilter;

      return matchesSearch && matchesSeverity && matchesType && matchesEntityType;
    });
  }, [violations, searchTerm, severityFilter, typeFilter, entityTypeFilter]);

  // Get unique values for filters
  const uniqueSeverities = useMemo(() => 
    [...new Set(violations.map(v => v.severity))], [violations]
  );
  const uniqueTypes = useMemo(() => 
    [...new Set(violations.map(v => v.rule_type))], [violations]
  );
  const uniqueEntityTypes = useMemo(() => 
    [...new Set(violations.map(v => v.entity_type).filter(Boolean))], [violations]
  );

  const getSeverityIcon = (severity: QualitySeverity) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
      default:
        return <Info className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
    }
  };

  const getSeverityBadgeVariant = (severity: QualitySeverity) => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const toggleRowExpansion = (violationId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(violationId)) {
      newExpanded.delete(violationId);
    } else {
      newExpanded.add(violationId);
    }
    setExpandedRows(newExpanded);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSeverityFilter('all');
    setTypeFilter('all');
    setEntityTypeFilter('all');
  };

  if (violations.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-12">
          <div className="space-y-2">
            <div className="text-green-600 dark:text-green-400 text-lg">✨ No violations found!</div>
            <p className="text-muted-foreground">All quality checks passed successfully.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Quality Violations</span>
          <Badge variant="outline">{filteredViolations.length} of {violations.length}</Badge>
        </CardTitle>
        <CardDescription>
          Detailed view of all quality issues found during validation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search violations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Severity</label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {uniqueSeverities.map(severity => (
                  <SelectItem key={severity} value={severity}>
                    <div className="flex items-center">
                      {getSeverityIcon(severity)}
                      <span className="ml-2 capitalize">{severity}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Rule Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Entity Type</label>
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {uniqueEntityTypes.map(entityType => (
                  <SelectItem key={entityType} value={entityType!}>
                    {entityType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Actions</label>
            <Button onClick={clearFilters} variant="outline" className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Violations Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Entity/Property</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredViolations.map((violation, index) => {
                const violationId = `${violation.rule_id}-${index}`;
                const isExpanded = expandedRows.has(violationId);
                
                return (
                  <React.Fragment key={violationId}>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(violationId)}
                          className="p-0 h-8 w-8"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant={getSeverityBadgeVariant(violation.severity)}>
                          <div className="flex items-center">
                            {getSeverityIcon(violation.severity)}
                            <span className="ml-1 capitalize">{violation.severity}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          {violation.entity_type && (
                            <div className="text-sm font-medium">{violation.entity_type}</div>
                          )}
                          {violation.property_name && (
                            <div className="text-xs text-muted-foreground">
                              {violation.property_name}
                            </div>
                          )}
                          {violation.entity_id && (
                            <div className="text-xs text-muted-foreground font-mono">
                              ID: {violation.entity_id.substring(0, 8)}...
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="max-w-md">
                          <p className="text-sm">{violation.message}</p>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {violation.rule_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {Math.round(violation.confidence * 100)}%
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/50">
                          <div className="space-y-4 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium mb-2">Expected vs Actual</h4>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Expected: </span>
                                    <span className="font-mono bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-green-800 dark:text-green-200">
                                      {violation.expected}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Actual: </span>
                                    <span className="font-mono bg-red-100 dark:bg-red-900 px-2 py-1 rounded text-red-800 dark:text-red-200">
                                      {violation.actual}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium mb-2">Details</h4>
                                <div className="space-y-1 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Rule ID: </span>
                                    <span className="font-mono">{violation.rule_id}</span>
                                  </div>
                                  {violation.relationship_type && (
                                    <div>
                                      <span className="text-muted-foreground">Relationship: </span>
                                      <span>{violation.relationship_type}</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-muted-foreground">Confidence: </span>
                                    <span>{Math.round(violation.confidence * 100)}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {violation.suggestion && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">💡 Suggestion</h4>
                                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-3">
                                  <p className="text-sm text-blue-800 dark:text-blue-200">{violation.suggestion}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredViolations.length === 0 && violations.length > 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No violations match the current filters.</p>
            <Button onClick={clearFilters} variant="outline" className="mt-2">
              Clear Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}