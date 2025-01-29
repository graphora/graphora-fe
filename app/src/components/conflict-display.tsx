import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ThumbsUp } from 'lucide-react'

interface PropertyDiff {
  staging: string
  prod: string
}

interface Suggestion {
  suggestion_type: string
  description: string
  confidence: number
  affected_properties: string[]
}

interface ConflictDisplayProps {
  conflict_type: string
  description: string
  properties_affected: Record<string, PropertyDiff>
  suggestions: Suggestion[]
  onSuggestionSelect: (suggestion: Suggestion) => void
}

export function ConflictDisplay({
  conflict_type,
  description,
  properties_affected,
  suggestions,
  onSuggestionSelect
}: ConflictDisplayProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Conflict Review Required</CardTitle>
          <Badge variant="destructive">{conflict_type}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Properties Affected:</h4>
          {Object.entries(properties_affected).map(([property, values]) => (
            <Card key={property} className="p-4">
              <h5 className="font-medium mb-2">{property}</h5>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Staging:</span>
                  <p className="text-sm p-2 bg-muted rounded-md">{values.staging}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Production:</span>
                  <p className="text-sm p-2 bg-muted rounded-md">{values.prod}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Suggested Actions:</h4>
          {suggestions.map((suggestion, index) => (
            <Card key={index} className="p-4 hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => onSuggestionSelect(suggestion)}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h5 className="font-medium">{suggestion.suggestion_type}</h5>
                  <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                  <div className="flex gap-1 mt-2">
                    {suggestion.affected_properties.map(prop => (
                      <Badge key={prop} variant="secondary">{prop}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    {Math.round(suggestion.confidence * 100)}% Match
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}