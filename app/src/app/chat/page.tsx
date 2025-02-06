'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatLayout } from '@/components/chat/chat-layout'
import { ChatMessage } from '@/components/chat/chat-message'
import { ChatInput } from '@/components/chat/chat-input'
import { ProgressSidebar } from '@/components/chat/progress-sidebar'
import { TopBar } from '@/components/chat/top-bar'
import { type Message, welcomeFlow } from '@/lib/types/chat'

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
    <ChatLayout>
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <ProgressSidebar />
        <main className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                onChoiceSelect={handleSend}
              />
            ))}
            {isTyping && (
              <div className="typing-indicator">
                <div className="dot" />
                <div className="dot" />
                <div className="dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <ChatInput onSend={handleSend} disabled={isTyping} />
        </main>
      </div>
    </ChatLayout>
  )
}
