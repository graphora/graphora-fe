'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export function AiAssistantToggle() {
  const [isAiAssistantVisible, setIsAiAssistantVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Get the setting from localStorage, default to false (hidden)
    const stored = localStorage.getItem('aiAssistantVisible')
    setIsAiAssistantVisible(stored === 'true')
  }, [])

  const handleToggle = (checked: boolean) => {
    setIsAiAssistantVisible(checked)
    localStorage.setItem('aiAssistantVisible', checked.toString())
    
    // Dispatch custom event to notify sidebar
    window.dispatchEvent(new CustomEvent('aiAssistantVisibilityChanged', { 
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
        id="ai-assistant-toggle"
        checked={isAiAssistantVisible}
        onCheckedChange={handleToggle}
      />
      <Label 
        htmlFor="ai-assistant-toggle" 
        className="text-sm font-medium cursor-pointer"
      >
        {isAiAssistantVisible ? 'Visible' : 'Hidden'}
      </Label>
    </div>
  )
} 