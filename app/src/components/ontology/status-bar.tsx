import { useOntologyStore } from '@/lib/store/ontology-store'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

interface StatusBarProps {
  validation: {
    isValid: boolean
    errors: string[]
  }
}

export function StatusBar({ validation }: StatusBarProps) {
  const { entities, relationships, getYamlContent } = useOntologyStore()
  const sections = entities.filter(e => e.isSection)
  const nonSectionEntities = entities.filter(e => !e.isSection)

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b flex items-center gap-2">
        <Badge variant="outline" className="h-6">
          Sections: {sections.length}
        </Badge>
        <Badge variant="outline" className="h-6">
          Entities: {nonSectionEntities.length}
        </Badge>
        <Badge variant="outline" className="h-6">
          Relationships: {relationships.length}
        </Badge>
        {validation.isValid ? (
          <Badge variant="outline" className="h-6 bg-green-500/10 text-green-500">
            Valid Structure
          </Badge>
        ) : (
          <Badge variant="outline" className="h-6 bg-yellow-500/10 text-yellow-500">
            {validation.errors.length} {validation.errors.length === 1 ? 'Issue' : 'Issues'}
          </Badge>
        )}
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {!validation.isValid && (
            <Alert variant="warning" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index} className="text-sm">
                      {error}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div>
            <h3 className="text-sm font-medium mb-2">YAML Preview</h3>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/30 p-2 rounded">
              {getYamlContent()}
            </pre>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
