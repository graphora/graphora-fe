'use client'

import { useOntologyEditorStore } from '@/lib/store/ontology-editor-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FolderTree, Wand2, ChevronRight, ChevronDown } from 'lucide-react'
import yaml from 'js-yaml'
import { useState } from 'react'

interface EntityListProps {
  onLoadSample: () => void
  showQuickActions?: boolean
}

export function EntityList({ onLoadSample, showQuickActions = true }: EntityListProps) {
  const { yaml: yamlContent } = useOntologyEditorStore()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Parse YAML to get sections and entities
  const { sections, entities } = yamlContent ? (() => {
    try {
      const parsed = yaml.load(yamlContent) as any
      return {
        sections: Object.entries(parsed?.sections || {}),
        entities: Object.entries(parsed?.entities || {})
      }
    } catch (e) {
      console.error('Failed to parse YAML:', e)
      return { sections: [], entities: [] }
    }
  })() : { sections: [], entities: [] }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  return (
    <div className="space-y-5">
      {showQuickActions && (
        <div className="rounded-2xl border border-white/20 bg-white/55 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-slate-700/40 dark:bg-slate-900/45">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-foreground/60">Quick Actions</p>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              variant="cta"
              className="w-full justify-center gap-2 text-sm shadow-[0_16px_32px_rgba(14,116,144,0.28)]"
              onClick={onLoadSample}
            >
              <Wand2 className="h-4 w-4" />
              Load sample ontology
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/15 bg-white/8 p-4 shadow-glass backdrop-blur-panel">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-foreground/55">Sections</p>
        <div className="space-y-2">
          {sections.length === 0 && (
            <p className="text-sm text-foreground/60">No sections available.</p>
          )}
          {sections.map(([name, items]) => (
            <div key={name} className="space-y-1">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-sm text-foreground/80 transition hover:border-primary/30 hover:bg-white/10"
                onClick={() => toggleSection(name)}
              >
                <span className="flex items-center gap-2">
                  {expandedSections.has(name) ? (
                    <ChevronDown className="h-4 w-4 text-primary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-foreground/50" />
                  )}
                  {name}
                </span>
                <Badge variant="glass" className="text-[0.6rem] uppercase tracking-[0.14em]">
                  {Array.isArray(items) ? items.length : 0}
                </Badge>
              </button>
              {expandedSections.has(name) && Array.isArray(items) && (
                <div className="ml-6 space-y-1">
                  {items.map((item: string) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-foreground/75 transition hover:bg-white/10"
                    >
                      <FolderTree className="h-4 w-4 text-primary" />
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/8 p-4 shadow-glass backdrop-blur-panel">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-foreground/55">Entities</p>
        <div className="space-y-1">
          {entities.length === 0 && (
            <p className="text-sm text-foreground/60">No entities defined yet.</p>
          )}
          {entities.map(([name]) => (
            <div
              key={name}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-foreground/75 transition hover:bg-white/10"
            >
              <FolderTree className="h-4 w-4 text-primary" />
              {name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
