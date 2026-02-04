import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

/**
 * Freeflow Schema Chat Store
 *
 * A simplified store for conversational schema generation without rigid Q&A flow.
 * Supports streaming responses and live schema preview.
 */

// Message types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  schemaUpdate?: string  // If message includes schema change
}

// Store state
export interface FreeflowChatState {
  // Session
  sessionId: string | null
  isSessionActive: boolean

  // Chat
  messages: ChatMessage[]
  isStreaming: boolean
  streamingMessageId: string | null
  error: string | null

  // Schema
  currentSchema: string | null
  schemaHistory: { content: string; timestamp: Date }[]

  // UI
  viewMode: 'chat' | 'split'
  inputValue: string
}

// Store actions
export interface FreeflowChatActions {
  // Session
  startSession: (initialSchema?: string) => Promise<void>
  loadSession: (sessionId: string) => Promise<void>

  // Chat
  sendMessage: (message: string) => Promise<void>
  appendToStreamingMessage: (content: string) => void
  finalizeStreamingMessage: (schemaUpdate?: string) => void
  setError: (error: string | null) => void

  // Schema
  setCurrentSchema: (schema: string) => void

  // UI
  setViewMode: (mode: 'chat' | 'split') => void
  setInputValue: (value: string) => void

  // Reset
  reset: () => void
}

const initialState: FreeflowChatState = {
  sessionId: null,
  isSessionActive: false,
  messages: [],
  isStreaming: false,
  streamingMessageId: null,
  error: null,
  currentSchema: null,
  schemaHistory: [],
  viewMode: 'split',
  inputValue: '',
}

export const useFreeflowChatStore = create<FreeflowChatState & FreeflowChatActions>()(
  immer((set, get) => ({
    ...initialState,

    startSession: async (initialSchema?: string) => {
      try {
        set((draft) => {
          draft.error = null
          draft.isStreaming = false
        })

        const params = new URLSearchParams()
        if (initialSchema) params.append('initial_schema', initialSchema)

        const response = await fetch(`/api/v1/chat/schema-chat/start?${params}`, {
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error('Failed to start session')
        }

        const data = await response.json()

        set((draft) => {
          draft.sessionId = data.session_id
          draft.isSessionActive = true
          draft.currentSchema = data.current_schema || null

          // Add welcome message
          if (data.welcome_message) {
            draft.messages.push({
              id: `welcome-${Date.now()}`,
              role: 'assistant',
              content: data.welcome_message,
              timestamp: new Date(),
            })
          }
        })
      } catch (error) {
        console.error('Error starting session:', error)
        set((draft) => {
          draft.error = error instanceof Error ? error.message : 'Failed to start session'
        })
      }
    },

    loadSession: async (sessionId: string) => {
      try {
        set((draft) => {
          draft.error = null
        })

        const response = await fetch(`/api/v1/chat/schema-chat/${sessionId}`)

        if (!response.ok) {
          throw new Error('Failed to load session')
        }

        const data = await response.json()

        set((draft) => {
          draft.sessionId = sessionId
          draft.isSessionActive = true
          draft.currentSchema = data.current_schema || null
          draft.messages = data.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.type === 'user_message' ? 'user' : 'assistant',
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            schemaUpdate: msg.metadata?.schema_content,
          }))
        })
      } catch (error) {
        console.error('Error loading session:', error)
        set((draft) => {
          draft.error = error instanceof Error ? error.message : 'Failed to load session'
        })
      }
    },

    sendMessage: async (message: string) => {
      const { sessionId, currentSchema } = get()

      if (!sessionId) {
        set((draft) => {
          draft.error = 'No active session'
        })
        return
      }

      // Add user message immediately
      const userMessageId = `user-${Date.now()}`
      set((draft) => {
        draft.messages.push({
          id: userMessageId,
          role: 'user',
          content: message,
          timestamp: new Date(),
        })
        draft.inputValue = ''
        draft.isStreaming = true
        draft.error = null
      })

      // Create placeholder for assistant message
      const assistantMessageId = `assistant-${Date.now()}`
      set((draft) => {
        draft.messages.push({
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        })
        draft.streamingMessageId = assistantMessageId
      })

      try {
        // Build request params
        const params = new URLSearchParams({
          message,
        })
        if (currentSchema) {
          params.append('current_schema', currentSchema)
        }

        // Stream response using SSE
        const response = await fetch(`/api/v1/chat/schema-chat/${sessionId}/stream?${params}`, {
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error('Failed to send message')
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('No response body')
        }

        let accumulatedContent = ''
        let schemaUpdate: string | undefined

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.type === 'text') {
                  accumulatedContent += data.content
                  get().appendToStreamingMessage(data.content)
                } else if (data.type === 'schema_update') {
                  schemaUpdate = data.content
                  set((draft) => {
                    draft.currentSchema = data.content
                    draft.schemaHistory.push({
                      content: data.content,
                      timestamp: new Date(),
                    })
                  })
                } else if (data.type === 'done') {
                  get().finalizeStreamingMessage(schemaUpdate)
                } else if (data.type === 'error') {
                  throw new Error(data.content)
                }
              } catch (parseError) {
                // Skip invalid JSON lines
                console.debug('Skipping invalid SSE line:', line)
              }
            }
          }
        }

        // Ensure message is finalized
        get().finalizeStreamingMessage(schemaUpdate)

      } catch (error) {
        console.error('Error sending message:', error)
        set((draft) => {
          draft.isStreaming = false
          draft.error = error instanceof Error ? error.message : 'Failed to send message'

          // Update the streaming message to show error
          const msgIndex = draft.messages.findIndex(m => m.id === assistantMessageId)
          if (msgIndex !== -1) {
            draft.messages[msgIndex].content = 'Sorry, an error occurred. Please try again.'
            draft.messages[msgIndex].isStreaming = false
          }
        })
      }
    },

    appendToStreamingMessage: (content: string) => {
      set((draft) => {
        const { streamingMessageId } = draft
        if (!streamingMessageId) return

        const msgIndex = draft.messages.findIndex(m => m.id === streamingMessageId)
        if (msgIndex !== -1) {
          draft.messages[msgIndex].content += content
        }
      })
    },

    finalizeStreamingMessage: (schemaUpdate?: string) => {
      set((draft) => {
        const { streamingMessageId } = draft
        if (!streamingMessageId) return

        const msgIndex = draft.messages.findIndex(m => m.id === streamingMessageId)
        if (msgIndex !== -1) {
          draft.messages[msgIndex].isStreaming = false
          if (schemaUpdate) {
            draft.messages[msgIndex].schemaUpdate = schemaUpdate
          }
        }

        draft.isStreaming = false
        draft.streamingMessageId = null
      })
    },

    setError: (error: string | null) => {
      set((draft) => {
        draft.error = error
      })
    },

    setCurrentSchema: (schema: string) => {
      set((draft) => {
        draft.currentSchema = schema
        draft.schemaHistory.push({
          content: schema,
          timestamp: new Date(),
        })
      })
    },

    setViewMode: (mode: 'chat' | 'split') => {
      set((draft) => {
        draft.viewMode = mode
      })
    },

    setInputValue: (value: string) => {
      set((draft) => {
        draft.inputValue = value
      })
    },

    reset: () => {
      set(() => ({ ...initialState }))
    },
  }))
)

// Convenience hooks
export const useFreeflowChat = () => {
  const store = useFreeflowChatStore()

  return {
    messages: store.messages,
    isStreaming: store.isStreaming,
    error: store.error,
    sendMessage: store.sendMessage,
    setError: store.setError,
  }
}

export const useFreeflowSchema = () => {
  const store = useFreeflowChatStore()

  return {
    currentSchema: store.currentSchema,
    schemaHistory: store.schemaHistory,
    setCurrentSchema: store.setCurrentSchema,
  }
}
