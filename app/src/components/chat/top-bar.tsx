'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/ui/logo'

export function TopBar() {
  const router = useRouter()

  return (
    <div className="h-16 border-b bg-background flex items-center px-4 gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push('/')}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
            <Logo 
              width={48}
              height={48}
              className="w-full h-full"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Graph Guru</h1>
            <p className="text-sm text-gray-500">Your AI Knowledge Graph Assistant</p>
          </div>
        </div>
      </div>
    </div>
  )
}
