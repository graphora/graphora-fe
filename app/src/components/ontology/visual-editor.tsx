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

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[VisualEditor]', ...args)
  }
}

export function VisualEditor() {
  const { ontology, updateFromOntology } = useOntologyEditorStore()
  const [activeView, setActiveView] = useState('graph')
  const [viewMode, setViewMode] = useState<'tree' | 'graph'>('graph')
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  const handleNodeSelect = (key: string) => {
    debug('Selected node:', key)
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
    debug('Expand all not implemented yet')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-background/85 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('tree')}
            className={cn(
              "flex items-center gap-1.5 rounded-full border border-transparent px-3 text-sm font-medium transition-all duration-150",
              viewMode === 'tree'
                ? "bg-white text-slate-900 shadow-[0_10px_26px_rgba(14,116,144,0.25)] ring-1 ring-inset ring-white/70 dark:bg-cyan-300/25 dark:text-slate-50 dark:shadow-[0_16px_34px_rgba(12,148,186,0.42)] dark:ring-cyan-100/65"
                : "text-muted-foreground hover:text-foreground hover:bg-white/35 dark:hover:bg-white/12"
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
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('graph')}
            className={cn(
              "flex items-center gap-1.5 rounded-full border border-transparent px-3 text-sm font-medium transition-all duration-150",
              viewMode === 'graph'
                ? "bg-white text-slate-900 shadow-[0_10px_26px_rgba(14,116,144,0.25)] ring-1 ring-inset ring-white/70 dark:bg-cyan-300/25 dark:text-slate-50 dark:shadow-[0_16px_34px_rgba(12,148,186,0.42)] dark:ring-cyan-100/65"
                : "text-muted-foreground hover:text-foreground hover:bg-white/35 dark:hover:bg-white/12"
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
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCollapseAll}
          className="rounded-full px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-white/20 dark:hover:bg-white/12"
        >
          Collapse All
        </Button>
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
