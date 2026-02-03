'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Settings, AlertCircle, RefreshCw, Sparkles } from 'lucide-react'
import { useSetupCheck } from '@/hooks/useSetupCheck'
import { SetupWelcomeModal } from './setup-welcome-modal'

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[EnhancedConfigCheck]', ...args)
  }
}

interface EnhancedConfigCheckProps {
  children: React.ReactNode
  requireDbConfig?: boolean
  requireAiConfig?: boolean
  showSetupModal?: boolean
  lightweight?: boolean // If true, don't show loading spinners or block content
}

export function EnhancedConfigCheck({ 
  children, 
  requireDbConfig = true, 
  requireAiConfig = false,
  showSetupModal = true,
  lightweight = false
}: EnhancedConfigCheckProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoaded } = useUser()
  const { setupStatus, refreshSetupStatus } = useSetupCheck()
  const [showModal, setShowModal] = useState(false)
  const [hasShownModal, setHasShownModal] = useState(false)

  // Check if user has dismissed the modal
  const shouldShowModal = useCallback(() => {
    if (!showSetupModal) return false

    // Check for permanent dismissal
    const permanentDismiss = localStorage.getItem('setup-modal-dismissed-permanent')
    if (permanentDismiss === 'true') {
      return false
    }

    // Check for temporary dismissal (7 days)
    const dismissed = localStorage.getItem('setup-modal-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - dismissedTime < sevenDaysMs) {
        return false
      }
    }
    return true
  }, [showSetupModal])

  useEffect(() => {
    if (!setupStatus.isLoading && !hasShownModal && isLoaded && user) {
      // Only show modal if not fully configured and haven't shown it yet
      if (!setupStatus.isFullyConfigured && shouldShowModal()) {
        // Don't show modal on config page to avoid confusion
        if (pathname !== '/config') {
          setShowModal(true)
          setHasShownModal(true)
        }
      }
    }
  }, [setupStatus.isLoading, setupStatus.isFullyConfigured, hasShownModal, isLoaded, user, pathname, shouldShowModal])

  const handleModalClose = () => {
    setShowModal(false)
    refreshSetupStatus() // Refresh status when modal closes
  }

  const handleRetry = () => {
    refreshSetupStatus()
  }

  if (!isLoaded || setupStatus.isLoading) {
    if (lightweight) {
      // In lightweight mode, show children with loading content
      return <>{children}</>
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Checking configuration...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Authentication Required</h2>
          <p className="text-muted-foreground">Please sign in to access this feature.</p>
        </div>
      </div>
    )
  }

  // Handle error state
  if (setupStatus.error) {
    const isBackendError = setupStatus.error.includes('fetch') || setupStatus.error.includes('500')
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-red-600" />
              Configuration Check Failed
            </CardTitle>
            <CardDescription>
              {isBackendError 
                ? "Unable to connect to the backend service. Please check if the API is running."
                : "There was an error checking your configuration."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {setupStatus.error}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button onClick={handleRetry} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              {!isBackendError && (
                <Button onClick={() => router.push('/config')} className="flex-1">
                  Go to Configuration
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if required configurations are missing and we're not on the config page
  // DB config is always optional (falls back to in-memory storage)
  // Only AI config can be required
  const missingAiConfig = requireAiConfig && !setupStatus.hasAiConfig
  const shouldRedirectToConfig = missingAiConfig && pathname !== '/config'

  if (shouldRedirectToConfig && !lightweight) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              AI Configuration Required
            </CardTitle>
            <CardDescription>
              This feature requires AI configuration to work properly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                Configure your Gemini API key to enable AI-powered document processing and conflict resolution.
              </AlertDescription>
            </Alert>

            <Button onClick={() => router.push('/config?tab=ai')} className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Configure AI
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      {children}
      
      {/* Setup Welcome Modal */}
      <SetupWelcomeModal
        isOpen={showModal}
        onClose={handleModalClose}
        setupStatus={setupStatus}
        onRefresh={refreshSetupStatus}
      />
    </>
  )
} 
