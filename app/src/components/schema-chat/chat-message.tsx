'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ChatMessageProps {
  message: {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
    type?: 'message' | 'question' | 'schema_preview' | 'progress' | 'error'
    metadata?: {
      questionId?: string
      schemaPreview?: string
      progress?: {
        current: number
        total: number
        label: string
      }
      error?: string
    }
  }
  onAction?: (action: string, data?: any) => void
}

export function ChatMessage({ message, onAction }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  return (
    <div className={cn(
      "flex items-start space-x-3",
      isUser ? 'justify-end' : 'justify-start'
    )}>
      {isAssistant && (
        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
      )}
      
      <div className={cn(
        "max-w-[70%] p-4 rounded-2xl",
        isUser 
          ? "bg-primary text-primary-foreground ml-auto" 
          : "bg-muted"
      )}>
        <div className={cn(
          "prose prose-sm max-w-none",
          isUser 
            ? "prose-invert" 
            : "prose-gray dark:prose-invert"
        )}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              // Customize markdown components
              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
              h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-sm">{children}</li>,
              code: ({ children, className }) => {
                const isInline = !className
                return isInline ? (
                  <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ) : (
                  <pre className="bg-muted p-3 rounded-lg overflow-x-auto">
                    <code className="text-xs font-mono">{children}</code>
                  </pre>
                )
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-muted-foreground/30 pl-3 italic">
                  {children}
                </blockquote>
              ),
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        
        {/* Progress indicator for progress messages */}
        {message.type === 'progress' && message.metadata?.progress && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{message.metadata.progress.label}</span>
              <span>{message.metadata.progress.current} / {message.metadata.progress.total}</span>
            </div>
            <div className="w-full bg-muted-foreground/20 rounded-full h-1.5">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(message.metadata.progress.current / message.metadata.progress.total) * 100}%` 
                }}
              />
            </div>
          </div>
        )}
        
        {/* Schema preview actions */}
        {message.type === 'schema_preview' && isAssistant && (
          <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
            <Button 
              variant="secondary" 
              size="sm"
              className="w-full"
              onClick={() => onAction?.('showPreview')}
            >
              👁️ Show Schema Preview
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="w-full"
              onClick={() => onAction?.('exportToEditor')}
            >
              📤 Export to Editor
            </Button>
          </div>
        )}

        {/* Question type indicators */}
        {message.type === 'question' && isAssistant && (
          <div className="mt-3 pt-2 border-t border-border/50">
            <Badge variant="secondary" className="text-xs">
              Question
            </Badge>
          </div>
        )}
      </div>
      
      {isUser && (
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-primary" />
        </div>
      )}
    </div>
  )
}