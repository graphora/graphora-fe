'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { type Message } from '@/lib/types/chat'
import { Button } from '@/components/ui/button'

interface ChatMessageProps {
  message: Message
  onChoiceSelect?: (value: string) => void
}

export function ChatMessage({ message, onChoiceSelect }: ChatMessageProps) {
  const [isTyping, setIsTyping] = useState(message.typing)

  // Simulate typing effect
  if (isTyping) {
    setTimeout(() => {
      setIsTyping(false)
    }, 1000)
  }

  return (
    <div
      className={cn(
        'message-bubble',
        'message-enter',
        message.sender === 'assistant' ? 'assistant-message' : 'user-message'
      )}
    >
      {isTyping ? (
        <div className="typing-indicator">
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
        </div>
      ) : (
        <>
          <div className="message-content">{message.content}</div>
          {message.choices && (
            <div className="quick-reply-buttons">
              {message.choices.map((choice) => (
                <Button
                  key={choice.value}
                  variant="outline"
                  onClick={() => onChoiceSelect?.(choice.value)}
                  className="flex flex-col items-start gap-1"
                >
                  <span className="text-lg flex items-center gap-2">
                    {choice.label}
                  </span>
                  {choice.description && (
                    <span className="text-sm text-gray-500">{choice.description}</span>
                  )}
                </Button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
