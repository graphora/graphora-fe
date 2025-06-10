'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Database, Sparkles, ArrowRight, Settings, AlertCircle } from 'lucide-react'
import { SetupStatus } from '@/hooks/useSetupCheck'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface SetupWelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  setupStatus: SetupStatus
  onRefresh: () => void
}

export function SetupWelcomeModal({ isOpen, onClose, setupStatus, onRefresh }: SetupWelcomeModalProps) {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleNavigateToConfig = async (section?: string) => {
    setIsNavigating(true)
    const configUrl = section ? `/config?tab=${section}` : '/config'
    router.push(configUrl)
    onClose()
  }

  const handleSkipForNow = () => {
    // Store in localStorage that user has seen this modal for this session
    localStorage.setItem('setup-modal-dismissed', Date.now().toString())
    onClose()
  }

  const canSkip = setupStatus.hasDbConfig // Can only skip if DB is configured

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card text-card-foreground border border-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-card-foreground">
              <Settings className="h-6 w-6 text-primary" />
              Welcome to Graphora! Let's get you set up
            </DialogTitle>
            <ThemeToggle />
          </div>
          <DialogDescription className="text-muted-foreground">
            To get the most out of Graphora, we need to configure a few things. 
            Let's check what you need to set up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Database Configuration */}
          <Card className={`transition-colors ${setupStatus.hasDbConfig ? 'border-green-500/20 bg-green-500/5' : 'border-orange-500/20 bg-orange-500/5'}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-card-foreground">
                <span className="flex items-center gap-2">
                  <Database className={`h-5 w-5 ${setupStatus.hasDbConfig ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`} />
                  <span className="text-card-foreground">Database Configuration</span>
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={setupStatus.hasDbConfig ? 'default' : 'destructive'} className={setupStatus.hasDbConfig ? 'bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30' : 'bg-red-500/10 text-red-700 border-red-500/20 hover:bg-red-500/20 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30'}>
                    {setupStatus.hasDbConfig ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Configured
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Required
                      </>
                    )}
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Neo4j database connections for staging and production environments. 
                These are required for storing and managing your knowledge graphs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {setupStatus.hasDbConfig ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-card-foreground">Staging Database:</span>
                    <span className="text-green-600 dark:text-green-400">✓ Configured</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-card-foreground">Production Database:</span>
                    <span className="text-green-600 dark:text-green-400">✓ Configured</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    You'll need to provide connection details for both staging and production Neo4j databases.
                  </p>
                  <Button 
                    onClick={() => handleNavigateToConfig('databases')} 
                    className="w-full"
                    disabled={isNavigating}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Configure Databases
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Configuration */}
          <Card className={`transition-colors ${setupStatus.hasAiConfig ? 'border-blue-500/20 bg-blue-500/5' : 'border-border bg-muted/30'}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-card-foreground">
                <span className="flex items-center gap-2">
                  <Sparkles className={`h-5 w-5 ${setupStatus.hasAiConfig ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
                  <span className="text-card-foreground">AI Configuration</span>
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={setupStatus.hasAiConfig ? 'default' : 'outline'} className={setupStatus.hasAiConfig ? 'bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30' : 'border-border text-muted-foreground'}>
                    {setupStatus.hasAiConfig ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Configured
                      </>
                    ) : (
                      'Recommended'
                    )}
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Gemini AI integration for intelligent document processing, entity extraction, 
                and conflict resolution. This enhances your knowledge graph capabilities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {setupStatus.hasAiConfig ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-card-foreground">Provider:</span>
                    <span className="text-blue-600 dark:text-blue-400">{setupStatus.aiConfig?.provider_display_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-card-foreground">API Key:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono">{setupStatus.aiConfig?.api_key_masked}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-card-foreground">Default Model:</span>
                    <span className="text-blue-600 dark:text-blue-400">{setupStatus.aiConfig?.default_model_display_name}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Configure your Gemini API key to enable AI-powered features like smart conflict resolution 
                    and automated entity extraction.
                  </p>
                  <Button 
                    onClick={() => handleNavigateToConfig('ai-config')} 
                    variant="outline"
                    className="w-full"
                    disabled={isNavigating}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Configure AI Integration
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {setupStatus.isFullyConfigured ? (
              <Button onClick={onClose} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Get Started with Graphora
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => handleNavigateToConfig()} 
                  className="flex-1"
                  disabled={isNavigating}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Go to Configuration
                </Button>
                {canSkip && (
                  <Button 
                    onClick={handleSkipForNow} 
                    variant="outline"
                    className="flex-1"
                  >
                    Continue Without AI
                  </Button>
                )}
              </>
            )}
          </div>

          {!setupStatus.hasDbConfig && (
            <p className="text-xs text-muted-foreground text-center">
              Database configuration is required to use Graphora's core features.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 