'use client'

import { useState, useRef, useEffect } from 'react'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { ChatLayout } from '@/components/chat/chat-layout'
import { ChatMessage } from '@/components/chat/chat-message'
import { ChatInput } from '@/components/chat/chat-input'
import { ProgressSidebar } from '@/components/chat/progress-sidebar'
import { TopBar } from '@/components/chat/top-bar'
import { type Message, welcomeFlow } from '@/lib/types/chat'
import { MessageSquare, Sparkles, Brain } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Only show welcome sequence if no messages exist
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        type: 'welcome',
        content: welcomeFlow.initial.message,
        sender: 'assistant',
        timestamp: Date.now(),
        typing: true
      }
      setMessages([welcomeMessage])
      setIsTyping(true)

      // Simulate typing delay then show data type question
      setTimeout(() => {
        setIsTyping(false)
        const dataTypeMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'question',
          content: welcomeFlow.dataType.message,
          sender: 'assistant',
          timestamp: Date.now(),
          choices: welcomeFlow.dataType.choices
        }
        setMessages(prev => [...prev, dataTypeMessage])
      }, welcomeFlow.initial.delay)
    }
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'question',
      content,
      sender: 'user',
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    // Simulate assistant response
    setTimeout(() => {
      setIsTyping(false)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'suggestion',
        content: 'I understand you want to work with ' + content + '. Let me help you structure that.',
        sender: 'assistant',
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, assistantMessage])
    }, 1000)
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="AI Assistant"
          description="Chat with AI to explore your knowledge graphs and get intelligent insights"
          icon={<Brain className="h-6 w-6" />}
          badge="Beta"
          actions={
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                <Sparkles className="h-3 w-3 mr-1" />
                Powered by AI
              </Badge>
              <Button variant="outline" size="sm">
                Clear Chat
              </Button>
            </div>
          }
        />

        <div className="flex-1 flex overflow-hidden">
          <ProgressSidebar />
          <main className="flex-1 flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((message) => (
                  <ChatMessage 
                    key={message.id} 
                    message={message} 
                    onChoiceSelect={handleSend}
                  />
                ))}
                {isTyping && (
                  <div className="flex items-center space-x-3 p-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                    <div className="typing-indicator flex space-x-1">
                      <div className="dot w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <div className="dot w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                      <div className="dot w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="border-t bg-white p-6">
              <div className="max-w-4xl mx-auto">
                <ChatInput onSend={handleSend} disabled={isTyping} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  )
}
