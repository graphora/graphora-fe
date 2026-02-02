'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, Settings, LogOut, HelpCircle, BarChart3 } from 'lucide-react'
import { useUser, useAuth, isAuthBypassEnabled } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { UsageTrackingModal } from '@/components/usage/usage-tracking-modal'

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[UserButton]', ...args)
  }
}

interface UserButtonProps {
  user?: {
    name?: string
    email?: string
    image?: string
  }
}

export function UserButton({ user: propUser }: UserButtonProps) {
  // Use our unified auth hook that works in both Clerk and bypass modes
  const { user: authUser } = useUser()
  const { signOut } = useAuth()
  const router = useRouter()
  const [showUsageModal, setShowUsageModal] = useState(false)

  const user = authUser || propUser
  const userName = (authUser?.fullName || authUser?.firstName || propUser?.name) || 'User'
  const userEmail = (authUser?.primaryEmailAddress?.emailAddress || propUser?.email) || 'support@graphora.io'
  const userImage = (authUser as { imageUrl?: string })?.imageUrl || propUser?.image
  
  const userInitials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleSignOut = async () => {
    if (isAuthBypassEnabled) {
      debug('Sign out clicked in bypass mode (no-op)')
      return
    }
    if (signOut) {
      await signOut()
    }
  }

  const handleProfile = () => {
    if (isAuthBypassEnabled) {
      debug('Profile clicked in bypass mode')
      return
    }
    // In Clerk mode, redirect to profile page or use Clerk's profile modal
    router.push('/profile')
  }

  const handleSettings = () => {
    router.push('/config')
  }

  const handleHelp = () => {
    window.location.href = 'mailto:support@graphora.io'
  }

  const handleUsageTracking = () => {
    setShowUsageModal(true)
  }

  const handleUsagePage = () => {
    router.push('/usage')
  }

  const handleCloseUsageModal = () => {
    setShowUsageModal(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={userImage} alt={userName} />
              <AvatarFallback className="bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500 text-white text-sm font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-popover backdrop-blur-sm border border-border shadow-lg" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {userEmail}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleProfile} className="text-popover-foreground hover:bg-accent">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSettings} className="text-popover-foreground hover:bg-accent">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleUsageTracking} className="text-popover-foreground hover:bg-accent">
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Usage & Billing</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleHelp} className="text-popover-foreground hover:bg-accent">
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-popover-foreground hover:bg-accent">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Modal rendered outside DropdownMenu to avoid portal conflicts */}
      {showUsageModal && (
        <UsageTrackingModal 
          isOpen={showUsageModal} 
          onClose={handleCloseUsageModal} 
        />
      )}
    </>
  )
} 
