'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  const isNetworkError = error.message.includes('fetch') || error.message.includes('Network')
  const isDatabaseError = error.message.includes('database') || error.message.includes('Neo4j')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-destructive">
            <AlertTriangle className="h-full w-full" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            {isNetworkError && "We're having trouble connecting to our services."}
            {isDatabaseError && "There's an issue with the database connection."}
            {!isNetworkError && !isDatabaseError && "An unexpected error occurred."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <strong>Error details:</strong>
            <p className="mt-1 font-mono text-xs break-words">
              {error.message || 'Unknown error occurred'}
            </p>
            {error.digest && (
              <p className="mt-1 text-xs">
                <strong>Error ID:</strong> {error.digest}
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={reset} 
              className="flex-1"
              aria-label="Try again"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
            <Link href="/">
              <Button 
                variant="outline" 
                className="flex-1"
                aria-label="Go to home page"
              >
                <Home className="h-4 w-4 mr-2" />
                Go home
              </Button>
            </Link>
          </div>

          {(isNetworkError || isDatabaseError) && (
            <div className="text-xs text-muted-foreground text-center">
              <p>If the problem persists, please check:</p>
              <ul className="mt-1 space-y-1">
                <li>• Your internet connection</li>
                <li>• That the backend service is running</li>
                <li>• Your database configuration</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}