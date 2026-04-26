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
  const hasChildren = type === 'section' || (data && (data.properties || data.relationships))
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
        <span className="mr-2" style={{ fontSize: 12.5, color: 'var(--fg)' }}>{name}</span>
        <span
          className="gx-mono"
          style={{
            fontSize: 10,
            color: 'var(--fg-faint)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {type}
        </span>
      </div>

      {expanded && data && (
        <div>
          {type === 'section' && Array.isArray(data) && data.map((item: string, index: number) => (
            <TreeNode
              key={`section-item-${item}-${index}`}
              name={item}
              type="entity"
              data={{}}
              level={level + 1}
            />
          ))}

          {data.properties && (
            <div style={{ paddingLeft: `${indent + 20}px` }}>
              <div className="gx-kicker" style={{ padding: '4px 0', margin: 0 }}>
                Properties
              </div>
              {Object.entries(data.properties).map(([propName, propData]: [string, any]) => (
                <div key={`prop-${name}-${propName}`} className="py-1 px-2">
                  <span className="gx-mono" style={{ fontSize: 12, color: 'var(--gx-accent)' }}>{propName}</span>
                  <span className="gx-mono ml-2" style={{ fontSize: 10.5, color: 'var(--fg-faint)' }}>
                    ({propData.type})
                  </span>
                </div>
              ))}
            </div>
          )}

          {data.relationships && (
            <div style={{ paddingLeft: `${indent + 20}px` }}>
              <div className="gx-kicker" style={{ padding: '4px 0', margin: 0 }}>
                Relationships
              </div>
              {Object.entries(data.relationships).map(([relName, relData]: [string, any]) => (
                <div key={`rel-${name}-${relName}`} className="py-1 px-2">
                  <span className="gx-mono" style={{ fontSize: 12, color: 'var(--edge)' }}>{relName}</span>
                  <span className="gx-mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                    {' '}→ {(relData as any).target}
                  </span>
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
  data: any
  expandedKeys?: string[]
  onNodeSelect?: (key: string) => void
  onToggleExpand?: (key: string, expanded: boolean) => void
}

export function TreeView({ data, expandedKeys = [], onNodeSelect, onToggleExpand }: TreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(expandedKeys))

  // Handle case where data is undefined or doesn't have required properties
  if (!data) {
    return <div className="p-4 text-muted-foreground">No data available</div>;
  }

  const toggleNode = (nodeName: string) => {
    const newExpanded = new Set(expandedNodes);
    const isCurrentlyExpanded = newExpanded.has(nodeName);
    
    if (isCurrentlyExpanded) {
      newExpanded.delete(nodeName);
    } else {
      newExpanded.add(nodeName);
    }
    
    setExpandedNodes(newExpanded);
    
    if (onToggleExpand) {
      onToggleExpand(nodeName, !isCurrentlyExpanded);
    }
  }

  // Check if entities exists to avoid error
  const entities = data.entities || {};
  // Check if entities exists to avoid error (if this needs to display sections as well)
  const sections = data.sections || {};

  return (
    <div className="p-2">
      {Object.keys(sections).length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-semibold mb-2">Sections</div>
          {Object.entries(sections).map(([sectionName, sectionData]: [string, any]) => (
            <TreeNode
              key={`section-${sectionName}`}
              name={sectionData?.name || sectionName}
              type="section"
              data={sectionData || {}}
              expanded={expandedNodes.has(sectionData?.name || sectionName)}
              onToggle={() => toggleNode(sectionData?.name || sectionName)}
            />
          ))}
        </div>
      )}

      <div>
        <div className="text-sm font-semibold mb-2">Entities</div>
        {Object.keys(entities).length > 0 ? (
          Object.entries(entities).map(([entityName, entityData]: [string, any]) => (
            <TreeNode
              key={`entity-${entityName}`}
              name={entityName}
              type="entity"
              data={entityData || {}}
              expanded={expandedNodes.has(entityName)}
              onToggle={() => toggleNode(entityName)}
            />
          ))
        ) : (
          <div className="text-sm text-muted-foreground py-2 px-2">No entities defined</div>
        )}
      </div>
    </div>
  )
}
