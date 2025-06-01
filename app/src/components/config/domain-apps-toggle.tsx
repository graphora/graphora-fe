'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export function DomainAppsToggle() {
  const [isDomainAppsVisible, setIsDomainAppsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Get the setting from localStorage, default to false (hidden)
    const stored = localStorage.getItem('domainAppsVisible')
    setIsDomainAppsVisible(stored === 'true')
  }, [])

  const handleToggle = (checked: boolean) => {
    setIsDomainAppsVisible(checked)
    localStorage.setItem('domainAppsVisible', checked.toString())
    
    // Dispatch custom event to notify sidebar
    window.dispatchEvent(new CustomEvent('domainAppsVisibilityChanged', { 
      detail: { visible: checked } 
    }))
  }

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center space-x-2">
        <Switch disabled />
        <Label className="opacity-50">Loading...</Label>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="domain-apps-toggle"
        checked={isDomainAppsVisible}
        onCheckedChange={handleToggle}
      />
      <Label 
        htmlFor="domain-apps-toggle" 
        className="text-sm font-medium cursor-pointer"
      >
        {isDomainAppsVisible ? 'Visible' : 'Hidden'}
      </Label>
    </div>
  )
} 