import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type ConflictMessage } from '@/types/merge'

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
  conflict: ConflictMessage
  onResolve: (resolution: string) => void
  canSubmit?: boolean
}

export function ConflictDisplay({
  conflict,
  onResolve,
  canSubmit = true
}: ConflictDisplayProps) {
  const { conflict_type, description, properties_affected, suggestions } = conflict

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium flex items-center">
          <Badge variant="outline" className="mr-2">
            {conflict_type}
          </Badge>
          Conflict Detected
        </h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>

      {Object.entries(properties_affected).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Properties Affected</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="font-medium">Property</div>
              <div className="font-medium">Staging</div>
              <div className="font-medium">Production</div>
              {Object.entries(properties_affected).map(([property, diff]) => (
                <>
                  <div key={`${property}-name`} className="border-t pt-2">
                    {property}
                  </div>
                  <div key={`${property}-staging`} className="border-t pt-2 bg-green-50 px-2">
                    {diff.staging}
                  </div>
                  <div key={`${property}-prod`} className="border-t pt-2 bg-blue-50 px-2">
                    {diff.prod}
                  </div>
                </>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Suggested Resolutions</h4>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <Card key={index} className="hover:border-blue-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium">{suggestion.suggestion_type}</h5>
                      <p className="text-sm text-gray-600">{suggestion.description}</p>
                      <div className="mt-1">
                        <Badge variant="outline" className="text-xs">
                          Confidence: {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => onResolve(JSON.stringify({
                        suggestion_type: suggestion.suggestion_type,
                        affected_properties: suggestion.affected_properties
                      }))}
                      disabled={!canSubmit}
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Apply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}