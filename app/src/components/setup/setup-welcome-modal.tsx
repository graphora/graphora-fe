'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  // Required: AI config. Optional: Staging DB. Required for merge: Prod DB
  const totalSteps = 2 // AI (required) + Prod DB (required for merge)
  const completedSteps = useMemo(() => {
    return [setupStatus.hasAiConfig, setupStatus.hasProdDb].filter(Boolean).length
  }, [setupStatus.hasAiConfig, setupStatus.hasProdDb])
  const setupProgress = (completedSteps / totalSteps) * 100

  const setupChecklist = useMemo(() => {
    return [
      {
        label: 'AI integration',
        completed: setupStatus.hasAiConfig,
        optional: false,
        note: 'Required for all workflows'
      },
      {
        label: 'Production database',
        completed: setupStatus.hasProdDb,
        optional: false,
        note: 'Required for merge operations'
      },
      {
        label: 'Staging database',
        completed: setupStatus.hasStagingDb,
        optional: true,
        note: 'Optional - uses in-memory if not configured'
      }
    ]
  }, [setupStatus.hasAiConfig, setupStatus.hasProdDb, setupStatus.hasStagingDb])

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

  const handleDontShowAgain = () => {
    localStorage.setItem('setup-modal-dismissed-permanent', 'true')
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
      <DialogContent className="glass-surface max-w-3xl max-h-[85vh] overflow-hidden border border-white/15 p-0 text-card-foreground shadow-large">
        <div className="grid gap-px bg-white/10 md:grid-cols-[1fr_1.4fr] overflow-y-auto max-h-[85vh]">
          <aside className="relative flex flex-col justify-between gap-6 bg-gradient-to-br from-primary/25 via-background/30 to-background/65 p-6 text-left backdrop-blur-panel">
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

              <div className="space-y-3 rounded-xl border border-white/15 bg-white/8 p-4 shadow-inner backdrop-blur-xl">
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

            <div className="rounded-lg border border-white/10 bg-white/7 p-3 text-xs text-foreground/75">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                <p>Credentials are encrypted before leaving your browser.</p>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="ml-auto text-primary hover:text-primary/80 shrink-0"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </aside>

          <section className="stack-gap bg-background/85 p-6 backdrop-blur-panel overflow-y-auto">
            <div className="stack-gap">
              {/* Production Database Card - Required for merge */}
              <Card
                variant="glass"
                className={cn(
                  'border-white/15 shadow-glass backdrop-blur-panel transition-all duration-200',
                  setupStatus.hasProdDb
                    ? 'bg-gradient-to-br from-success/15 via-background/40 to-background/10'
                    : 'bg-gradient-to-br from-warning/20 via-background/35 to-background/10'
                )}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Database className={cn('h-4 w-4', setupStatus.hasProdDb ? 'text-success' : 'text-warning')} />
                      Production database
                    </span>
                    <Badge variant={setupStatus.hasProdDb ? 'success' : 'warning'} className="text-xs">
                      {setupStatus.hasProdDb ? 'Configured' : 'Required for merge'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  {setupStatus.hasProdDb ? (
                    <p className="text-xs text-success">✓ Connected</p>
                  ) : (
                    <Button
                      onClick={() => handleNavigateToConfig('databases')}
                      variant="cta"
                      size="sm"
                      className="w-full justify-center text-xs"
                      disabled={isNavigating}
                    >
                      Configure
                      <ArrowRight className="ml-1.5 h-3 w-3" />
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Staging Database Card - Optional (in-memory fallback) */}
              <Card
                variant="glass"
                className={cn(
                  'border-white/15 shadow-glass backdrop-blur-panel transition-all duration-200',
                  setupStatus.hasStagingDb
                    ? 'bg-gradient-to-br from-success/15 via-background/40 to-background/10'
                    : 'bg-gradient-to-br from-info/15 via-background/40 to-background/10'
                )}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {setupStatus.hasStagingDb ? (
                        <Database className="h-4 w-4 text-success" />
                      ) : (
                        <HardDrive className="h-4 w-4 text-info" />
                      )}
                      Staging database
                    </span>
                    <Badge variant={setupStatus.hasStagingDb ? 'success' : 'info'} className="text-xs">
                      {setupStatus.hasStagingDb ? 'Configured' : 'In-memory'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  {setupStatus.hasStagingDb ? (
                    <p className="text-xs text-success">✓ Connected</p>
                  ) : (
                    <Button
                      onClick={() => handleNavigateToConfig('databases')}
                      variant="outline"
                      size="sm"
                      className="w-full justify-center text-xs"
                      disabled={isNavigating}
                    >
                      Configure (optional)
                      <ArrowRight className="ml-1.5 h-3 w-3" />
                    </Button>
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
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Sparkles className={cn('h-4 w-4', setupStatus.hasAiConfig ? 'text-info' : 'text-muted-foreground')} />
                      AI configuration
                    </span>
                    <Badge variant={setupStatus.hasAiConfig ? 'info' : 'neutral'} className="text-xs">
                      {setupStatus.hasAiConfig ? 'Configured' : 'Required'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  {setupStatus.hasAiConfig ? (
                    <div className="space-y-1 text-xs text-info">
                      <p>✓ {setupStatus.aiConfig?.provider_display_name}</p>
                      <p className="text-muted-foreground">{setupStatus.aiConfig?.default_model_display_name}</p>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleNavigateToConfig('ai-config')}
                      variant="cta"
                      size="sm"
                      className="w-full justify-center text-xs"
                      disabled={isNavigating}
                    >
                      Configure
                      <ArrowRight className="ml-1.5 h-3 w-3" />
                    </Button>
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

            {!setupStatus.isFullyConfigured && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleDontShowAgain}
                  className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors underline-offset-2 hover:underline"
                >
                  Don&apos;t show this again
                </button>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
