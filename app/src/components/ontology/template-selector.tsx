'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Building2,
  ShoppingCart,
  GraduationCap,
  Scale,
  TrendingUp,
  Loader2,
  FileCode,
  GitBranch,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

interface OntologyTemplate {
  id: string
  name: string
  description: string
  entities: string[]
  relationships: string[]
  use_cases: string[]
  content?: string
}

interface TemplateSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate: (template: OntologyTemplate) => void
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  company_person: <Building2 className="h-5 w-5" />,
  product_catalog: <ShoppingCart className="h-5 w-5" />,
  research_papers: <GraduationCap className="h-5 w-5" />,
  legal_contracts: <Scale className="h-5 w-5" />,
  financial_analysis: <TrendingUp className="h-5 w-5" />,
}

const TEMPLATE_COLORS: Record<string, string> = {
  company_person: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  product_catalog: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  research_papers: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  legal_contracts: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  financial_analysis: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

export function TemplateSelector({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<OntologyTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<OntologyTemplate | null>(null)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [activeTab, setActiveTab] = useState<'browse' | 'preview'>('browse')

  useEffect(() => {
    if (open) {
      fetchTemplates()
    }
  }, [open])

  const fetchTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/v1/ontology-templates')
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplateContent = async (templateId: string) => {
    setLoadingTemplate(true)
    try {
      const response = await fetch(`/api/v1/ontology-templates/${templateId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch template details')
      }
      const data = await response.json()
      setSelectedTemplate(data)
      setActiveTab('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template')
    } finally {
      setLoadingTemplate(false)
    }
  }

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate)
      onOpenChange(false)
      setSelectedTemplate(null)
      setActiveTab('browse')
    }
  }

  const handleSelectForPreview = (template: OntologyTemplate) => {
    if (template.content) {
      setSelectedTemplate(template)
      setActiveTab('preview')
    } else {
      fetchTemplateContent(template.id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl">Ontology Templates</DialogTitle>
          <DialogDescription>
            Choose a pre-built template to quickly start modeling your knowledge graph
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'browse' | 'preview')} className="flex-1">
          <div className="px-6 pt-2">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="browse">Browse</TabsTrigger>
              <TabsTrigger value="preview" disabled={!selectedTemplate}>
                Preview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="browse" className="mt-0 p-0">
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                  <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                  <p className="text-destructive font-medium">{error}</p>
                  <Button variant="outline" className="mt-4" onClick={fetchTemplates}>
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      isSelected={selectedTemplate?.id === template.id}
                      isLoading={loadingTemplate && selectedTemplate?.id === template.id}
                      onSelect={() => handleSelectForPreview(template)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preview" className="mt-0 p-0">
            {selectedTemplate && (
              <div className="flex flex-col h-[500px]">
                <div className="px-6 py-4 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${TEMPLATE_COLORS[selectedTemplate.id] || 'bg-primary/10 text-primary'}`}>
                      {TEMPLATE_ICONS[selectedTemplate.id] || <FileCode className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedTemplate.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileCode className="h-3.5 w-3.5" />
                      <span>{selectedTemplate.entities.length} entities</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <GitBranch className="h-3.5 w-3.5" />
                      <span>{selectedTemplate.relationships.length} relationships</span>
                    </div>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <pre className="p-6 text-sm font-mono bg-slate-950 text-slate-50 dark:bg-slate-900">
                    <code>{selectedTemplate.content}</code>
                  </pre>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="cta"
            disabled={!selectedTemplate}
            onClick={handleUseTemplate}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Use Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface TemplateCardProps {
  template: OntologyTemplate
  isSelected: boolean
  isLoading: boolean
  onSelect: () => void
}

function TemplateCard({ template, isSelected, isLoading, onSelect }: TemplateCardProps) {
  const iconColor = TEMPLATE_COLORS[template.id] || 'bg-primary/10 text-primary'
  const icon = TEMPLATE_ICONS[template.id] || <FileCode className="h-5 w-5" />

  return (
    <button
      onClick={onSelect}
      disabled={isLoading}
      className={`
        relative text-left p-4 rounded-xl border transition-all duration-200
        hover:shadow-lg hover:-translate-y-0.5
        ${isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border bg-card hover:border-primary/50'
        }
        ${isLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
      `}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg ${iconColor}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{template.name}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {template.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {template.entities.slice(0, 4).map((entity) => (
          <Badge key={entity} variant="secondary" className="text-xs">
            {entity}
          </Badge>
        ))}
        {template.entities.length > 4 && (
          <Badge variant="outline" className="text-xs">
            +{template.entities.length - 4} more
          </Badge>
        )}
      </div>

      {template.use_cases && template.use_cases.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-1.5">Best for:</p>
          <div className="flex flex-wrap gap-1">
            {template.use_cases.slice(0, 2).map((useCase, i) => (
              <span key={i} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {useCase}
              </span>
            ))}
          </div>
        </div>
      )}

      {isSelected && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="h-5 w-5 text-primary" />
        </div>
      )}
    </button>
  )
}
