'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TreeNodeProps {
  name: string
  type: 'section' | 'entity'
  data: any
  level?: number
  expanded?: boolean
  onToggle?: () => void
}

function TreeNode({ name, type, data, level = 0, expanded = false, onToggle }: TreeNodeProps) {
  const hasChildren = type === 'section' || data.properties || data.relationships
  const indent = level * 20

  return (
    <div>
      <div 
        className={cn(
          "flex items-center py-1 px-2 hover:bg-accent rounded-sm cursor-pointer",
          type === 'section' ? 'font-semibold' : ''
        )}
        style={{ paddingLeft: `${indent}px` }}
        onClick={onToggle}
      >
        {hasChildren && (
          <span className="mr-1">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        )}
        <span className="mr-2">{name}</span>
        <span className="text-xs text-muted-foreground text-gray-400">{type}</span>
      </div>

      {expanded && (
        <div>
          {type === 'section' && Array.isArray(data) && data.map((item: string) => (
            <TreeNode
              key={item}
              name={item}
              type="entity"
              data={{}}
              level={level + 1}
            />
          ))}

          {data.properties && (
            <div style={{ paddingLeft: `${indent + 20}px` }}>
              <div className="text-sm text-muted-foreground py-1 font-semibold text-purple-800">Properties:</div>
              {Object.entries(data.properties).map(([propName, propData]: [string, any]) => (
                <div key={propName} className="py-1 px-2">
                  <span className="font-mono text-sm text-blue-800">{propName}</span>
                  <span className="text-xs text-muted-foreground ml-2 text-gray-500">({propData.type})</span>
                </div>
              ))}
            </div>
          )}

          {data.relationships && (
            <div style={{ paddingLeft: `${indent + 20}px` }}>
              <div className="text-sm text-muted-foreground py-1 font-semibold text-pink-800">Relationships:</div>
              {Object.entries(data.relationships).map(([relName, relData]: [string, any]) => (
                <div key={relName} className="py-1 px-2">
                  <span className="font-mono text-sm text-orange-800">{relName}</span>
                  <span className="font-mono text-sm text-orange-800"> → {(relData as any).target}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface TreeViewProps {
  ontology: {
    sections: Record<string, any>
    entities: Record<string, any>
  }
  onChange?: (ontology: any) => void
}

export function TreeView({ ontology, onChange }: TreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const toggleNode = (nodeName: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeName)) {
      newExpanded.delete(nodeName)
    } else {
      newExpanded.add(nodeName)
    }
    setExpandedNodes(newExpanded)
  }

  return (
    <div className="p-2">
      <div className="mb-4">
        <div className="text-sm font-semibold mb-2">Sections</div>
        {Object.entries(ontology.sections || {}).map(([name, data]) => (
          <TreeNode
            key={data.name}
            name={data.name}
            type="section"
            data={data}
            expanded={expandedNodes.has(data.name)}
            onToggle={() => toggleNode(data.name)}
          />
        ))}
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">Entities</div>
        {Object.entries(ontology.entities || {}).map(([name, data]) => (
          <TreeNode
            key={data.name}
            name={data.name}
            type="entity"
            data={data}
            expanded={expandedNodes.has(data.name)}
            onToggle={() => toggleNode(data.name)}
          />
        ))}
      </div>
    </div>
  )
}
