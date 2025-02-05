import { CheckCircle2, AlertCircle } from 'lucide-react'
import { useOntologyStore } from '@/lib/store/ontology-store'

export function StatusBar() {
  const { entities, sections } = useOntologyStore()
  
  const relationshipCount = entities.reduce(
    (count, entity) => count + Object.keys(entity.relationships || {}).length,
    0
  )

  const isValid = sections.length > 0 && entities.length > 0

  return (
    <div className="h-8 border-t bg-gray-50 flex items-center px-3 text-sm text-gray-600 gap-4">
      <div className="flex items-center gap-2">
        {isValid ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-yellow-500" />
        )}
        <span>
          {isValid ? 'Valid Structure' : 'Missing required elements'}
        </span>
      </div>
      <div className="h-4 w-px bg-gray-300" />
      <div>Sections: {sections.length}</div>
      <div>Entities: {entities.length}</div>
      <div>Relationships: {relationshipCount}</div>
    </div>
  )
}
