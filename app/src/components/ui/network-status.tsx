'use client'

import { useNetworkStatus } from '@/hooks/use-network-status'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Wifi, WifiOff } from 'lucide-react'

export function NetworkStatus() {
  const { isOnline, wasOffline } = useNetworkStatus()

  if (isOnline && !wasOffline) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert className={isOnline ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={isOnline ? 'text-green-800' : 'text-red-800'}>
            {isOnline ? 'Connection restored' : 'No internet connection'}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  )
}