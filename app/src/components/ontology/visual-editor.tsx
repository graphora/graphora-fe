'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOntologyEditorStore } from '@/lib/store/ontology-editor-store'
import { TreeView } from './tree-view'
import { Button } from '@/components/ui/button'
import { Plus, GitFork, NetworkIcon, AlignLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { AddEntityModal } from './add-entity-modal'
import { AddRelationshipModal } from './add-relationship-modal'
import { GraphView } from './graph-view'
import { cn } from '@/lib/utils'

export function VisualEditor() {
  const { ontology, updateFromOntology } = useOntologyEditorStore()
  const [activeView, setActiveView] = useState('graph')
  const [viewMode, setViewMode] = useState<'tree' | 'graph'>('graph')
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  const handleNodeSelect = (key: string) => {
    console.log('Selected node:', key);
  }

  const handleToggleExpand = (key: string, isExpanded: boolean) => {
    if (isExpanded) {
      setExpandedKeys([...expandedKeys, key])
    } else {
      setExpandedKeys(expandedKeys.filter((k) => k !== key))
    }
  }

  const handleCollapseAll = () => {
    setExpandedKeys([]);
  }

  const handleExpandAll = () => {
    console.log('Expand all not implemented yet');
  }

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background flex items-center justify-between p-2 border-b shadow-sm">
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('tree')}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5",
              viewMode === 'tree'
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12h-8" />
              <path d="M21 6H8" />
              <path d="M21 18h-8" />
              <path d="M3 6v4c0 1.1.9 2 2 2h3" />
              <path d="M3 10v6c0 1.1.9 2 2 2h3" />
            </svg>
            <span>Tree View</span>
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5",
              viewMode === 'graph'
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span>Graph View</span>
          </button>
        </div>
        <div>
          <button
            onClick={handleCollapseAll}
            className="px-3 py-1.5 rounded-md text-sm hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {viewMode === 'tree' ? (
          <TreeView
            data={ontology || {}}
            expandedKeys={expandedKeys}
            onNodeSelect={handleNodeSelect}
            onToggleExpand={handleToggleExpand}
          />
        ) : (
          <GraphView 
            ontology={ontology || {}}
            onChange={updateFromOntology}
          />
        )}
      </div>
    </div>
  )
}
