'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { IconBadge } from '@/components/ui/icon-badge'
import { CheckCircle, Database, Sparkles, ArrowRight, Settings, AlertCircle, Shield, HelpCircle, HardDrive } from 'lucide-react'
import { SetupStatus } from '@/hooks/useSetupCheck'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'

interface SetupWelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  setupStatus: SetupStatus
  onRefresh: () => void
}

export function SetupWelcomeModal({ isOpen, onClose, setupStatus, onRefresh }: SetupWelcomeModalProps) {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  // In memory mode, only AI config is required
  const totalSteps = setupStatus.isMemoryStorage ? 1 : 2
  const completedSteps = useMemo(() => {
    if (setupStatus.isMemoryStorage) {
      return setupStatus.hasAiConfig ? 1 : 0
    }
    return [setupStatus.actualHasDbConfig, setupStatus.hasAiConfig].filter(Boolean).length
  }, [setupStatus.hasAiConfig, setupStatus.actualHasDbConfig, setupStatus.isMemoryStorage])
  const setupProgress = (completedSteps / totalSteps) * 100

  const setupChecklist = useMemo(() => {
    const items = []

    // Database item - show as optional in memory mode
    items.push({
      label: setupStatus.isMemoryStorage ? 'Database connections (Optional)' : 'Database connections',
      completed: setupStatus.actualHasDbConfig,
      optional: setupStatus.isMemoryStorage,
    })

    items.push({
      label: 'AI integration',
      completed: setupStatus.hasAiConfig,
      optional: false,
    })

    return items
  }, [setupStatus.hasAiConfig, setupStatus.actualHasDbConfig, setupStatus.isMemoryStorage])

  const handleNavigateToConfig = async (section?: string) => {
    setIsNavigating(true)
    const configUrl = section ? `/config?tab=${section}` : '/config'
    router.push(configUrl)
    onClose()
  }

  const handleSkipForNow = () => {
    localStorage.setItem('setup-modal-dismissed', Date.now().toString())
    onClose()
  }

  // Can skip if in memory mode (DB not required) or if DB is actually configured
  const canSkip = setupStatus.isMemoryStorage || setupStatus.actualHasDbConfig

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="glass-surface max-w-5xl overflow-hidden border border-white/15 p-0 text-card-foreground shadow-large">
        <div className="grid gap-px bg-white/10 md:grid-cols-[1fr_1.2fr] lg:grid-cols-[1.05fr_1.25fr]">
          <aside className="relative flex flex-col justify-between gap-8 bg-gradient-to-br from-primary/25 via-background/30 to-background/65 p-8 text-left backdrop-blur-panel">
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <Badge
                  variant={setupStatus.isFullyConfigured ? 'success' : 'info'}
                  className="uppercase tracking-[0.18em] text-[0.6rem]"
                >
                  {setupStatus.isFullyConfigured ? 'Setup Complete' : 'Setup Incomplete'}
                </Badge>
                <ThemeToggle />
              </div>

              <div className="space-y-3">
                <DialogTitle className="flex items-center gap-3 text-display-sm">
                  <IconBadge variant="primary" size="md">
                    <Settings className="h-5 w-5" />
                  </IconBadge>
                  Welcome to Graphora
                </DialogTitle>
                <DialogDescription className="max-w-md text-body text-foreground/80">
                  Configure the essential services so your workspace is production-ready for document ingestion, AI enrichment, and merge workflows.
                </DialogDescription>
              </div>

              <div className="space-y-4 rounded-2xl border border-white/15 bg-white/8 p-6 shadow-inner backdrop-blur-xl">
                <div className="flex items-center justify-between text-[0.7rem] font-medium uppercase tracking-[0.22em] text-foreground/60">
                  <span>Setup Progress</span>
                  <span className="text-foreground/80">
                    {completedSteps}/{totalSteps} complete
                  </span>
                </div>
                <Progress
                  value={setupProgress}
                  className="h-2 overflow-hidden rounded-full bg-white/15"
                  indicatorClassName="bg-gradient-to-r from-primary via-primary/90 to-info"
                />
                <div className="space-y-3">
                  {setupChecklist.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-3 text-foreground/90">
                        <IconBadge
                          variant={item.completed ? 'success' : (item.optional ? 'info' : 'warning')}
                          size="sm"
                          className="h-8 w-8"
                        >
                          {item.completed ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : item.optional ? (
                            <HardDrive className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                        </IconBadge>
                        {item.label}
                      </span>
                      <Badge
                        variant={item.completed ? 'success' : (item.optional ? 'info' : 'warning')}
                        className="tracking-[0.08em]"
                      >
                        {item.completed ? 'Ready' : (item.optional ? 'Optional' : 'Pending')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/7 p-5 text-xs text-foreground/75 shadow-inner">
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-primary" />
                <div className="space-y-2">
                  <p className="font-medium uppercase tracking-[0.16em] text-foreground/80">Security first</p>
                  <p>
                    Database credentials and API keys are encrypted with hardware-backed keys before they ever leave your browser. Graphora never stores plain-text secrets.
                  </p>
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex items-center gap-2 font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    Need assistance? Refresh status
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <section className="stack-gap bg-background/85 p-8 backdrop-blur-panel">
            <div className="stack-gap">
              <Card
                variant="glass"
                className={cn(
                  'border-white/15 shadow-glass backdrop-blur-panel transition-all duration-200',
                  setupStatus.actualHasDbConfig
                    ? 'bg-gradient-to-br from-success/15 via-background/40 to-background/10'
                    : setupStatus.isMemoryStorage
                      ? 'bg-gradient-to-br from-info/15 via-background/40 to-background/10'
                      : 'bg-gradient-to-br from-warning/20 via-background/35 to-background/10'
                )}
              >
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-heading">
                    <span className="flex items-center gap-3">
                      <IconBadge
                        variant={setupStatus.actualHasDbConfig ? 'success' : (setupStatus.isMemoryStorage ? 'info' : 'warning')}
                        size="sm"
                      >
                        {setupStatus.isMemoryStorage && !setupStatus.actualHasDbConfig ? (
                          <HardDrive className="h-4 w-4 text-info" />
                        ) : (
                          <Database className={cn('h-4 w-4', setupStatus.actualHasDbConfig ? 'text-success' : 'text-warning')} />
                        )}
                      </IconBadge>
                      Database configuration
                    </span>
                    <Badge variant={setupStatus.actualHasDbConfig ? 'success' : (setupStatus.isMemoryStorage ? 'info' : 'warning')}>
                      {setupStatus.actualHasDbConfig ? 'Configured' : (setupStatus.isMemoryStorage ? 'Optional' : 'Required')}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {setupStatus.isMemoryStorage
                      ? 'Using in-memory storage. Configure databases for persistent storage across sessions.'
                      : 'Connect staging and production Neo4j databases so workflow results can be persisted automatically.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {setupStatus.actualHasDbConfig ? (
                    <div className="grid gap-3 text-sm md:grid-cols-2">
                      <div className="rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-success">
                        <p className="font-medium uppercase tracking-[0.14em] text-success/70">Staging</p>
                        <p className="text-display-xs">✓</p>
                        <p className="text-xs text-success/80">Connected</p>
                      </div>
                      <div className="rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-success">
                        <p className="font-medium uppercase tracking-[0.14em] text-success/70">Production</p>
                        <p className="text-display-xs">✓</p>
                        <p className="text-xs text-success/80">Connected</p>
                      </div>
                    </div>
                  ) : setupStatus.isMemoryStorage ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-info/25 bg-info/10 px-4 py-3 text-info">
                        <p className="font-medium uppercase tracking-[0.14em] text-info/70">In-Memory Mode</p>
                        <p className="text-xs text-info/80">Data stored temporarily. Configure databases for persistence.</p>
                      </div>
                      <Button
                        onClick={() => handleNavigateToConfig('databases')}
                        variant="outline"
                        className="w-full justify-center text-sm"
                        disabled={isNavigating}
                      >
                        <Database className="mr-2 h-4 w-4" />
                        Configure databases (optional)
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-body text-muted-foreground">
                        Provide unique URIs and credentials for both staging and production Neo4j clusters. Test each connection after saving to ensure Graphora can reach them.
                      </p>
                      <Button
                        onClick={() => handleNavigateToConfig('databases')}
                        variant="cta"
                        className="w-full justify-center text-sm"
                        disabled={isNavigating}
                      >
                        <Database className="mr-2 h-4 w-4" />
                        Configure databases
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card
                variant="glass"
                className={cn(
                  'border-white/15 shadow-glass backdrop-blur-panel transition-all duration-200',
                  setupStatus.hasAiConfig
                    ? 'bg-gradient-to-br from-info/15 via-background/40 to-background/10'
                    : 'bg-gradient-to-br from-info/10 via-background/35 to-background/10'
                )}
              >
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-heading">
                    <span className="flex items-center gap-3">
                      <IconBadge variant="info" size="sm">
                        <Sparkles className={cn('h-4 w-4', setupStatus.hasAiConfig ? 'text-info' : 'text-muted-foreground')} />
                      </IconBadge>
                      AI configuration
                    </span>
                    <Badge variant={setupStatus.hasAiConfig ? 'info' : 'neutral'}>
                      {setupStatus.hasAiConfig ? 'Configured' : 'Recommended'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Unlock AI-powered summarisation, conflict resolution, and schema insights with Gemini.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {setupStatus.hasAiConfig ? (
                    <div className="grid gap-3 text-sm">
                      <div className="flex items-center justify-between rounded-lg border border-info/20 bg-info/10 px-4 py-3 text-info">
                        <span className="uppercase tracking-[0.14em] text-info/70">Provider</span>
                        <span className="font-medium">{setupStatus.aiConfig?.provider_display_name}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-info/20 bg-info/10 px-4 py-3 text-info">
                        <span className="uppercase tracking-[0.14em] text-info/70">API key</span>
                        <span className="font-mono text-sm">{setupStatus.aiConfig?.api_key_masked}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-info/20 bg-info/10 px-4 py-3 text-info">
                        <span className="uppercase tracking-[0.14em] text-info/70">Default model</span>
                        <span className="font-medium">{setupStatus.aiConfig?.default_model_display_name}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-body text-muted-foreground">
                        Add your Gemini API key and select a default model to enable intelligent enrichment and QA assistance across workflows.
                      </p>
                      <Button
                        onClick={() => handleNavigateToConfig('ai-config')}
                        variant="cta"
                        className="w-full justify-center text-sm"
                        disabled={isNavigating}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Configure AI integration
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              {setupStatus.isFullyConfigured ? (
                <Button onClick={onClose} variant="cta" className="w-full justify-center text-sm">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Enter workspace
                </Button>
              ) : (
                <Button
                  onClick={() => handleNavigateToConfig()}
                  variant="cta"
                  className="w-full justify-center text-sm"
                  disabled={isNavigating}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Open configuration
                </Button>
              )}

              {canSkip && !setupStatus.isFullyConfigured && (
                <Button
                  onClick={handleSkipForNow}
                  variant="outline"
                  className="w-full justify-center text-sm"
                >
                  Skip for now
                </Button>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
