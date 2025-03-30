'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, ChevronDown, Settings, LogOut, User } from 'lucide-react'
import { useUser, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

interface MainHeaderProps {
  hasUnsavedChanges?: boolean
}

export function MainHeader({ hasUnsavedChanges }: MainHeaderProps) {
  const router = useRouter()
  const { user } = useUser()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleHomeClick = async () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?')
      if (!confirmed) return
    }
    setIsNavigating(true)
    router.push('/')
  }

  return (
    <header className="h-14 px-4 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors duration-150 flex items-center gap-2"
          onClick={handleHomeClick}
          disabled={isNavigating}
        >
          <Home className="w-5 h-5" />
          <span className="font-medium">Graphora</span>
        </Button>
        {/* <div className="text-xl font-semibold text-gray-800">Graphora</div> */}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{user.fullName}</span>
            <UserButton 
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 rounded-full border-2 border-white",
                }
              }}
            />
          </div>
        )}
      </div>
    </header>
  )
}
