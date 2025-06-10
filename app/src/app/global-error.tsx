'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-6 h-16 w-16 text-destructive">
              <AlertTriangle className="h-full w-full" />
            </div>
            
            <h1 className="text-2xl font-bold mb-2">
              Oops! Something went wrong
            </h1>
            
            <p className="text-muted-foreground mb-6">
              We're sorry, but something unexpected happened. This error has been logged and we'll look into it.
            </p>

            <div className="bg-muted p-4 rounded-lg mb-6 text-left">
              <p className="text-sm font-medium mb-2">Error details:</p>
              <p className="text-xs font-mono text-muted-foreground break-words">
                {error.message || 'Unknown error occurred'}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <Button 
                onClick={reset} 
                className="w-full"
                aria-label="Reload the application"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Application
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
                className="w-full"
                aria-label="Return to home page"
              >
                Return to Home
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              If this problem continues, please try refreshing your browser or contact support.
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}