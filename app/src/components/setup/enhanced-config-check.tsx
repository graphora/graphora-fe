'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Settings, AlertCircle, Database, RefreshCw, Sparkles } from 'lucide-react'
import { useSetupCheck } from '@/hooks/useSetupCheck'
import { SetupWelcomeModal } from './setup-welcome-modal'

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

  // Check if user has dismissed the modal recently (within 24 hours)
  const shouldShowModal = () => {
    if (!showSetupModal) return false
    
    const dismissed = localStorage.getItem('setup-modal-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const oneDayMs = 24 * 60 * 60 * 1000
      if (Date.now() - dismissedTime < oneDayMs) {
        return false
      }
    }
    return true
  }

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
  }, [setupStatus.isLoading, setupStatus.isFullyConfigured, hasShownModal, isLoaded, user, pathname])

  const handleModalClose = () => {
    setShowModal(false)
    refreshSetupStatus() // Refresh status when modal closes
  }

  const handleRetry = () => {
    refreshSetupStatus()
  }

  const handleSkipConfig = () => {
    // Allow user to proceed without full configuration in development mode
    console.log('User chose to skip configuration')
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
  const missingDbConfig = requireDbConfig && !setupStatus.hasDbConfig
  const missingAiConfig = requireAiConfig && !setupStatus.hasAiConfig
  const shouldRedirectToConfig = (missingDbConfig || missingAiConfig) && pathname !== '/config'

  if (shouldRedirectToConfig && !lightweight) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {missingDbConfig ? (
                <Database className="h-6 w-6 text-blue-600" />
              ) : (
                <Sparkles className="h-6 w-6 text-blue-600" />
              )}
              Configuration Required
            </CardTitle>
            <CardDescription>
              {missingDbConfig 
                ? "You need to configure your Neo4j databases before you can use this feature."
                : "This feature requires AI configuration to work properly."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {missingDbConfig && (
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  Configure your staging and production Neo4j databases to store and manage your knowledge graphs.
                </AlertDescription>
              </Alert>
            )}
            
            {missingAiConfig && (
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  Configure your Gemini API key to enable AI-powered document processing and conflict resolution.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={() => router.push('/config')} className="flex-1">
                <Settings className="h-4 w-4 mr-2" />
                Go to Configuration
              </Button>
              {!missingDbConfig && (
                <Button onClick={handleSkipConfig} variant="outline" className="flex-1">
                  Continue Without AI
                </Button>
              )}
            </div>
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