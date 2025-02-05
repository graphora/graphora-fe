import { useOntologyStore } from '@/lib/store/ontology-store'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface StatusBarProps {
  validation: any
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
        {validation?.isValid && (
          <Badge variant="outline" className="h-6 bg-green-500/10 text-green-500">
            Valid Structure
          </Badge>
        )}
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4">
          <h3 className="text-sm font-medium mb-2">YAML Preview</h3>
          <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/30 p-2 rounded">
            {getYamlContent()}
          </pre>
        </div>
      </ScrollArea>
    </div>
  )
}
