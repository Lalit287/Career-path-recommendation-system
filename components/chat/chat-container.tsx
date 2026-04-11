"use client"

import { useEffect } from "react"
import { Bot } from "lucide-react"
import { ChatMessage } from "./chat-message"
import { TypingIndicator } from "./typing-indicator"
import type { ChatMessageModel } from "./types"

const quickPrompts = [
  "Suggest careers for me",
  "What skills are needed for AI Engineer?",
  "How do I use this website?",
  "Compare web dev and data science",
]

type ChatContainerProps = {
  messages: ChatMessageModel[]
  isLoading: boolean
  onQuickPrompt: (prompt: string) => void
  scrollAnchorRef: React.RefObject<HTMLDivElement | null>
}

export function ChatContainer({
  messages,
  isLoading,
  onQuickPrompt,
  scrollAnchorRef,
}: ChatContainerProps) {
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })
  }, [messages, isLoading, scrollAnchorRef])

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-muted/20 p-4 [scrollbar-gutter:stable]"
      role="log"
      aria-label="Chat messages"
    >
      {messages.length === 0 ? (
        <div className="space-y-4">
          <div className="mx-auto max-w-full rounded-2xl border bg-background p-4 text-sm shadow-sm">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <Bot className="h-4 w-4 shrink-0 text-primary" />
              Welcome
            </div>
            <p className="break-words text-muted-foreground [overflow-wrap:anywhere] whitespace-pre-wrap">
              Hi! I&apos;m your AI career assistant. I can help with role selection, skill gaps, roadmaps,
              and salary insights.
            </p>
          </div>
          <div className="space-y-2 px-1">
            <p className="text-xs font-medium text-muted-foreground">Try asking:</p>
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onQuickPrompt(prompt)}
                disabled={isLoading}
                className="w-full max-w-full rounded-xl border bg-background px-3 py-2 text-left text-xs break-words transition hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {messages.map((message, index) => (
            <ChatMessage key={message.id} message={message} index={index} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={scrollAnchorRef} className="h-px w-full shrink-0" aria-hidden />
        </div>
      )}
    </div>
  )
}
