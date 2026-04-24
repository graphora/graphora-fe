'use client'

import React, { useState, useEffect, useRef, useMemo, FormEvent, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2,
  Send,
  Sparkles,
  Code2,
  PanelLeftClose,
  PanelLeft,
  Copy,
  Check,
  Download,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/layouts/page-header'
import { BrandMark } from '@/components/graphora'
import { YAMLEditor } from '@/components/ontology/yaml-editor'
import { useOntologyEditorStore } from '@/lib/store/ontology-editor-store'
import { useFreeflowChatStore, type ChatMessage } from '@/lib/store/schema-freeflow-store'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Schema Chat — conversational ontology designer.
 *
 * Split-pane: chat on the left, live schema preview on the right.
 * - Empty chat surfaces onboarding prompts (click to auto-fill input).
 * - Assistant bubbles emphasized with a subtle bg-elev surface + accent
 *   leading rail; user messages muted, right-aligned — the conversation
 *   should read as "the assistant's ideas."
 * - Schema preview header shows live entity/relation counts parsed from
 *   the YAML so you can see at a glance what was generated.
 * - "Use in editor" CTA sits in a sticky footer inside the preview, right
 *   next to the schema — no more hunting for it in the page toolbar.
 */

const STARTER_PROMPTS = [
  {
    title: 'Research papers',
    body: 'I want to track academic research papers, their authors, institutions, and citation relationships.',
  },
  {
    title: 'E-commerce',
    body: 'Create a schema for an e-commerce platform with products, categories, customers, orders, and reviews.',
  },
  {
    title: 'CRM',
    body: 'I need to model customer relationships — companies, contacts, deals, and interactions over time.',
  },
  {
    title: 'Clinical records',
    body: 'Design a healthcare schema covering patients, providers, encounters, diagnoses, and medications.',
  },
]

export default function SchemaChatPage() {
  const router = useRouter()
  const { user } = useUser()
  const { updateFromYaml } = useOntologyEditorStore()

  const {
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
  } = useFreeflowChatStore()

  const [copied, setCopied] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!isSessionActive && user) {
      startSession()
    }
  }, [user, isSessionActive, startSession])

  useEffect(() => {
    if (!isStreaming && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isStreaming])

  const schemaStats = useMemo(() => parseSchemaStats(currentSchema), [currentSchema])

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

  const handlePickPrompt = (prompt: string) => {
    setInputValue(prompt)
    inputRef.current?.focus()
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      <div style={{ padding: '28px 32px 0' }}>
        <PageHeader
          kicker="Tools · AI schema designer"
            title="Schema designer"
            description="Describe your data domain in plain language — Graphora drafts the ontology, you refine it in chat."
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'split' ? 'chat' : 'split')}
                  title={viewMode === 'split' ? 'Hide schema preview' : 'Show schema preview'}
                  className="gap-1.5"
                >
                  {viewMode === 'split' ? (
                    <>
                      <PanelLeftClose className="h-[13px] w-[13px]" />
                      Hide preview
                    </>
                  ) : (
                    <>
                      <PanelLeft className="h-[13px] w-[13px]" />
                      Show preview
                    </>
                  )}
                </Button>
              </div>
            }
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <div
            className={cn(
              'h-full grid gap-4',
              viewMode === 'split' ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : 'grid-cols-1',
            )}
            style={{ padding: '20px 32px 32px' }}
          >
            {/* ============ CHAT PANEL ============ */}
            <div
              className="flex flex-col h-full overflow-hidden"
              style={{
                background: 'var(--bg-elev)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-md)',
              }}
            >
              <ChatHeader messageCount={messages.length} sessionActive={isSessionActive} />

              {/* Message list */}
              <ScrollArea className="flex-1">
                <div className="px-5 py-4 space-y-4">
                  {isEmpty ? (
                    <EmptyChatOnboarding onPick={handlePickPrompt} />
                  ) : (
                    messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Error banner */}
              {error && (
                <div
                  className="flex items-start gap-2 mx-4 mb-3"
                  style={{
                    padding: '10px 12px',
                    background: 'color-mix(in oklch, var(--danger), transparent 92%)',
                    border: '1px solid color-mix(in oklch, var(--danger), transparent 70%)',
                    borderRadius: 'var(--r-sm)',
                  }}
                >
                  <AlertTriangle
                    className="h-[14px] w-[14px] mt-0.5 flex-shrink-0"
                    style={{ color: 'var(--danger)' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--fg)', lineHeight: 1.5 }}>{error}</span>
                </div>
              )}

              {/* Input composer */}
              <form
                onSubmit={handleSubmit}
                style={{
                  borderTop: '1px solid var(--line)',
                  background: 'var(--bg-deep)',
                  padding: 14,
                }}
              >
                <div className="flex gap-2 items-end">
                  <Textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isEmpty
                        ? 'Describe your data domain…'
                        : 'Ask for changes, additions, or clarifications…'
                    }
                    className="min-h-[60px] max-h-[160px] resize-none"
                    style={{ fontSize: 13 }}
                    disabled={isStreaming || !isSessionActive}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-[60px] w-11 flex-shrink-0"
                    disabled={isStreaming || !inputValue.trim() || !isSessionActive}
                    title="Send (⌘↵)"
                  >
                    {isStreaming ? (
                      <Loader2 className="h-[15px] w-[15px] animate-spin" />
                    ) : (
                      <Send className="h-[15px] w-[15px]" />
                    )}
                  </Button>
                </div>
                <div
                  className="flex items-center justify-between mt-2"
                  style={{ fontSize: 10.5, color: 'var(--fg-faint)' }}
                >
                  <span>
                    <kbd
                      className="gx-mono"
                      style={{
                        padding: '1px 5px',
                        fontSize: 10,
                        border: '1px solid var(--line)',
                        borderRadius: 3,
                        background: 'var(--bg-elev)',
                        color: 'var(--fg-muted)',
                      }}
                    >
                      ↵
                    </kbd>{' '}
                    to send ·{' '}
                    <kbd
                      className="gx-mono"
                      style={{
                        padding: '1px 5px',
                        fontSize: 10,
                        border: '1px solid var(--line)',
                        borderRadius: 3,
                        background: 'var(--bg-elev)',
                        color: 'var(--fg-muted)',
                      }}
                    >
                      ⇧↵
                    </kbd>{' '}
                    for newline
                  </span>
                  {inputValue.length > 0 && (
                    <span className="gx-mono" style={{ color: 'var(--fg-faint)' }}>
                      {inputValue.length} chars
                    </span>
                  )}
                </div>
              </form>
            </div>

            {/* ============ SCHEMA PREVIEW ============ */}
            {viewMode === 'split' && (
              <div
                className="flex flex-col h-full overflow-hidden"
                style={{
                  background: 'var(--bg-elev)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-md)',
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Code2 className="h-[13px] w-[13px] flex-shrink-0" style={{ color: 'var(--fg-muted)' }} />
                    <span
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 500,
                        color: 'var(--fg)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      Schema preview
                    </span>
                    {schemaStats && (
                      <span
                        className="gx-mono"
                        style={{
                          fontSize: 10.5,
                          color: 'var(--fg-faint)',
                          letterSpacing: '0.04em',
                          marginLeft: 6,
                        }}
                      >
                        · {schemaStats.entities} entities · {schemaStats.relations} relations
                      </span>
                    )}
                  </div>
                  {currentSchema && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopySchema}
                        title="Copy schema"
                      >
                        {copied ? (
                          <Check className="h-4 w-4" style={{ color: 'var(--gx-success)' }} />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDownloadSchema}
                        title="Download schema.yaml"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-hidden">
                  {currentSchema ? (
                    <YAMLEditor value={currentSchema} onChange={() => {}} readOnly height="100%" />
                  ) : (
                    <SchemaPreviewEmpty />
                  )}
                </div>

                {/* Sticky "Use in editor" — right next to the schema it's about */}
                {currentSchema && (
                  <div
                    className="flex items-center justify-between"
                    style={{
                      padding: '10px 14px',
                      borderTop: '1px solid var(--line)',
                      background: 'var(--bg-deep)',
                    }}
                  >
                    <span
                      className="gx-mono"
                      style={{ fontSize: 10.5, color: 'var(--fg-muted)', letterSpacing: '0.08em' }}
                    >
                      READY TO EDIT · OPEN IN ONTOLOGY WORKBENCH
                    </span>
                    <Button size="sm" onClick={handleUseInOntologyEditor} className="gap-1.5">
                      Use in editor
                      <ArrowRight className="h-[13px] w-[13px]" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
  )
}

// ==========================================================================
// Sub-components
// ==========================================================================

function ChatHeader({
  messageCount,
  sessionActive,
}: {
  messageCount: number
  sessionActive: boolean
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-[13px] w-[13px]" style={{ color: 'var(--gx-accent)' }} />
        <span
          style={{
            fontSize: '13.5px',
            fontWeight: 500,
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
          }}
        >
          Conversation
        </span>
      </div>
      <div
        className="flex items-center gap-3 gx-mono"
        style={{ fontSize: 10.5, color: 'var(--fg-faint)', letterSpacing: '0.08em' }}
      >
        <span>{messageCount} MSG</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: sessionActive ? 'var(--gx-success)' : 'var(--fg-faint)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'currentColor',
            }}
          />
          {sessionActive ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
    </div>
  )
}

function EmptyChatOnboarding({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center" style={{ paddingTop: 32, paddingBottom: 16 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--bg-elev-2)',
          border: '1px solid var(--line)',
          display: 'grid',
          placeItems: 'center',
          marginBottom: 14,
        }}
      >
        <BrandMark size={24} />
      </div>
      <div className="gx-kicker" style={{ marginBottom: 6 }}>
        Graphora · AI schema designer
      </div>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: '-0.015em',
          color: 'var(--fg)',
          margin: 0,
          lineHeight: 1.3,
        }}
      >
        What domain should I model for you?
      </h2>
      <p
        style={{
          fontSize: 13,
          color: 'var(--fg-muted)',
          marginTop: 6,
          maxWidth: 420,
          lineHeight: 1.5,
        }}
      >
        Describe what you&apos;re tracking, who the actors are, and how they relate. I&apos;ll draft a YAML schema you can refine.
      </p>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full"
        style={{ marginTop: 22, maxWidth: 520 }}
      >
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p.title}
            type="button"
            onClick={() => onPick(p.body)}
            className="text-left transition-colors"
            style={{
              padding: '10px 12px',
              background: 'var(--bg-deep)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-sm)',
              cursor: 'pointer',
            }}
          >
            <div
              className="gx-kicker"
              style={{ margin: 0, marginBottom: 4, color: 'var(--gx-accent)' }}
            >
              {p.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg)', lineHeight: 1.45 }}>{p.body}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%]"
          style={{
            background: 'var(--bg-elev-2)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
            padding: '10px 14px',
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: 'var(--fg)',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              margin: 0,
            }}
          >
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  // Assistant
  return (
    <div className="flex items-start gap-2.5">
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'var(--bg-elev-2)',
          border: '1px solid var(--line)',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <BrandMark size={14} />
      </div>
      <div
        className="flex-1 min-w-0 gx-chat-md"
        style={{
          background: 'var(--bg-deep)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-md)',
          padding: '12px 14px',
          color: 'var(--fg)',
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        {message.content ? (
          <AssistantMarkdown content={message.content} />
        ) : message.isStreaming ? null : (
          // Defensive: if content is empty and we're not streaming,
          // something upstream failed — show a visible placeholder
          // instead of an empty bubble.
          <span style={{ color: 'var(--fg-faint)', fontStyle: 'italic' }}>
            (empty response — try again)
          </span>
        )}
        {message.isStreaming && <TypingDots />}
      </div>
    </div>
  )
}

/**
 * ErrorBoundary around ReactMarkdown.
 *
 * React render-time errors inside children cannot be caught by a parent's
 * `try/catch` — only a class boundary with `componentDidCatch` /
 * `getDerivedStateFromError` can intercept them. If markdown parsing
 * throws (e.g. remark-gfm choking on malformed input) we fall back to
 * plain-text rendering with `white-space: pre-wrap` so newlines and
 * bullet-ish lines remain readable.
 */
class MarkdownBoundary extends React.Component<
  { content: string; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    if (typeof console !== 'undefined') {
      console.error('[schema-chat] Markdown render failed, falling back to plain text:', error)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {this.props.content}
        </div>
      )
    }
    return this.props.children
  }
}

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <MarkdownBoundary content={content}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...rest }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" {...rest}>
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </MarkdownBoundary>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5" style={{ marginTop: 4 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--fg-muted)',
            animation: 'gx-typing 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
            opacity: 0.4,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes gx-typing {
          0%, 100% { opacity: 0.3; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}

function SchemaPreviewEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center" style={{ padding: 24 }}>
      <Sparkles className="h-9 w-9 mb-3" style={{ color: 'var(--fg-faint)' }} />
      <div className="gx-kicker" style={{ marginBottom: 6 }}>
        Awaiting schema
      </div>
      <h3
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--fg)',
          letterSpacing: '-0.01em',
          margin: 0,
        }}
      >
        No schema drafted yet
      </h3>
      <p
        style={{
          fontSize: 12,
          color: 'var(--fg-muted)',
          marginTop: 6,
          maxWidth: 320,
          lineHeight: 1.5,
        }}
      >
        Describe your domain in the chat on the left — the YAML schema will render here as it&apos;s generated.
      </p>
    </div>
  )
}

/**
 * Parse entity + relation counts out of the YAML schema. Cheap text scan
 * (no yaml-parse dep) — we're just looking for top-level keys under the
 * `entities:` and `relationships:` sections.
 */
function parseSchemaStats(yaml: string | null): { entities: number; relations: number } | null {
  if (!yaml) return null
  let entities = 0
  let relations = 0
  let section: 'entities' | 'relations' | null = null

  for (const rawLine of yaml.split('\n')) {
    const line = rawLine.replace(/\s+$/, '')
    if (!line.trim() || line.trim().startsWith('#')) continue

    // Top-level section header (no leading indent)
    if (/^entities:\s*$/i.test(line)) {
      section = 'entities'
      continue
    }
    if (/^(relationships|relations):\s*$/i.test(line)) {
      section = 'relations'
      continue
    }
    if (/^\S/.test(line)) {
      // Exiting a section via a new top-level key
      section = null
      continue
    }

    // Child of active section — count keys that sit one indent level in
    if (section && /^\s{2,4}[A-Za-z_][\w-]*:/.test(line)) {
      const indent = line.match(/^\s+/)?.[0].length ?? 0
      if (indent <= 4) {
        if (section === 'entities') entities += 1
        else relations += 1
      }
    }
  }

  if (entities === 0 && relations === 0) return null
  return { entities, relations }
}
