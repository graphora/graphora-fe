'use client'

import { useEffect } from 'react'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Wifi, WifiOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NetworkStatus() {
  const { isOnline, wasOffline, dismissRestored } = useNetworkStatus()

  // Auto-dismiss "Connection restored" after 3 seconds
  useEffect(() => {
    if (isOnline && wasOffline) {
      const timer = setTimeout(() => {
        dismissRestored()
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline, dismissRestored])

  if (isOnline && !wasOffline) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert className={isOnline ? 'border-success bg-green-50 dark:bg-green-950 dark:border-success' : 'border-destructive bg-red-50 dark:bg-red-950 dark:border-destructive'}>
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-success dark:text-success" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive dark:text-destructive" />
            )}
            <AlertDescription className={isOnline ? 'text-success dark:text-success' : 'text-destructive dark:text-destructive'}>
              {isOnline ? 'Connection restored' : 'No internet connection'}
            </AlertDescription>
          </div>
          {isOnline && (
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissRestored}
              className="h-6 w-6 p-0 hover:bg-success dark:hover:bg-success"
            >
              <X className="h-3.5 w-3.5 text-success dark:text-success" />
            </Button>
          )}
        </div>
      </Alert>
    </div>
  )
}