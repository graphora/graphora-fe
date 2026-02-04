'use client'

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import {
  Loader2,
  Send,
  Sparkles,
  Code2,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Copy,
  Check,
  Download,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { YAMLEditor } from '@/components/ontology/yaml-editor'
import { useOntologyEditorStore } from '@/lib/store/ontology-editor-store'
import { useFreeflowChatStore } from '@/lib/store/schema-freeflow-store'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function SchemaChatPage() {
  const router = useRouter()
  const { user } = useUser()
  const { updateFromYaml } = useOntologyEditorStore()

  // Freeflow chat store
  const {
    sessionId,
    isSessionActive,
    messages,
    isStreaming,
    error,
    currentSchema,
    viewMode,
    inputValue,
    startSession,
    sendMessage,
    setViewMode,
    setInputValue,
    setError,
    reset,
  } = useFreeflowChatStore()

  // Local state
  const [copied, setCopied] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Start session on mount
  useEffect(() => {
    if (!isSessionActive && user) {
      startSession()
    }
  }, [user, isSessionActive, startSession])

  // Focus input after streaming completes
  useEffect(() => {
    if (!isStreaming && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isStreaming])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isStreaming) return

    await sendMessage(inputValue.trim())
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  const handleCopySchema = () => {
    if (currentSchema) {
      navigator.clipboard.writeText(currentSchema)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleUseInOntologyEditor = () => {
    if (currentSchema) {
      updateFromYaml(currentSchema)
      router.push('/ontology')
    }
  }

  const handleDownloadSchema = () => {
    if (currentSchema) {
      const blob = new Blob([currentSchema], { type: 'text/yaml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'schema.yaml'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        <PageHeader
          title="Schema Designer"
          description="Design your knowledge graph schema through conversation"
          icon={<Sparkles className="h-6 w-6" />}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(viewMode === 'split' ? 'chat' : 'split')}
                title={viewMode === 'split' ? 'Hide schema preview' : 'Show schema preview'}
              >
                {viewMode === 'split' ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
              {currentSchema && (
                <Button
                  variant="cta"
                  size="sm"
                  onClick={handleUseInOntologyEditor}
                >
                  Use in Editor
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          }
        />

        <div className="flex-1 overflow-hidden">
          <div className={cn(
            'h-full grid gap-4 p-4',
            viewMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'
          )}>
            {/* Chat Panel */}
            <div className="flex flex-col h-full bg-background rounded-lg border">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-lg px-4 py-3',
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content || (message.isStreaming ? '...' : '')}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                        {message.isStreaming && (
                          <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="mx-4 mb-2">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Input */}
              <form onSubmit={handleSubmit} className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your data domain, ask for changes, or request a schema..."
                    className="min-h-[80px] resize-none"
                    disabled={isStreaming || !isSessionActive}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-[80px] w-12"
                    disabled={isStreaming || !inputValue.trim() || !isSessionActive}
                  >
                    {isStreaming ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </form>
            </div>

            {/* Schema Preview Panel */}
            {viewMode === 'split' && (
              <div className="flex flex-col h-full bg-background rounded-lg border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Schema Preview</span>
                  </div>
                  {currentSchema && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleCopySchema}
                        title="Copy schema"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleDownloadSchema}
                        title="Download schema"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-hidden">
                  {currentSchema ? (
                    <YAMLEditor
                      value={currentSchema}
                      onChange={() => {}}
                      readOnly={true}
                      height="100%"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">
                        No schema yet
                      </h3>
                      <p className="text-sm text-muted-foreground/70 max-w-xs">
                        Describe your data domain in the chat and I'll help you design a schema.
                      </p>
                      <div className="mt-6 space-y-2 text-left">
                        <p className="text-xs font-medium text-muted-foreground">Try saying:</p>
                        <ul className="text-xs text-muted-foreground/70 space-y-1">
                          <li>"I want to track research papers and their authors"</li>
                          <li>"Create a schema for an e-commerce platform"</li>
                          <li>"I need to model customer relationships"</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
