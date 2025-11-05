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
      <Alert className={isOnline ? 'border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-700' : 'border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-700'}>
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <AlertDescription className={isOnline ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
              {isOnline ? 'Connection restored' : 'No internet connection'}
            </AlertDescription>
          </div>
          {isOnline && (
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissRestored}
              className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900"
            >
              <X className="h-3.5 w-3.5 text-green-700 dark:text-green-300" />
            </Button>
          )}
        </div>
      </Alert>
    </div>
  )
}