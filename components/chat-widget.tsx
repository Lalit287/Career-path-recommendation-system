"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, X, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChatContainer } from "./chat/chat-container"
import { ChatInput } from "./chat/chat-input"
import type { ChatMessageModel } from "./chat/types"

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function parseJsonSafe(text: string): Record<string, unknown> {
  if (!text.trim()) return {}
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessageModel[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const scrollAnchorRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<ChatMessageModel[]>([])
  const pendingRef = useRef(false)

  messagesRef.current = messages

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const sendUserMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || pendingRef.current) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    pendingRef.current = true
    setIsLoading(true)

    const now = Date.now()
    const userMessage: ChatMessageModel = {
      id: makeId("user"),
      role: "user",
      content: trimmed,
      createdAt: now,
    }

    setMessages((prev) => [...prev, userMessage])

    const historyForApi = [...messagesRef.current, userMessage]

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          messages: historyForApi.map(({ id, role, content }) => ({ id, role, content })),
        }),
        signal: controller.signal,
      })

      const raw = await response.text()
      const data = parseJsonSafe(raw)

      if (controller.signal.aborted) return

      const assistantText = (() => {
        if (!response.ok) {
          const err = data.error
          if (typeof err === "string" && err.trim()) return `Sorry — ${err}`
          return "Sorry, something went wrong. Please try again in a moment."
        }
        const content = data.content
        if (typeof content === "string" && content.trim()) return content
        return "I couldn't generate a response right now. Please try again."
      })()

      setMessages((prev) => [
        ...prev,
        {
          id: makeId("assistant"),
          role: "assistant",
          content: assistantText,
          createdAt: Date.now(),
        },
      ])
    } catch (err) {
      if (controller.signal.aborted) return
      const message =
        err instanceof Error && err.name === "AbortError"
          ? null
          : "Network issue while contacting the assistant. Please try again."
      if (message) {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId("assistant"),
            role: "assistant",
            content: message,
            createdAt: Date.now(),
          },
        ])
      }
    } finally {
      if (abortRef.current === controller) {
        pendingRef.current = false
        setIsLoading(false)
      }
    }
  }, [])

  const onSubmit = useCallback(async () => {
    const text = input
    setInput("")
    await sendUserMessage(text)
  }, [input, sendUserMessage])

  const handleQuickPrompt = useCallback(
    (prompt: string) => {
      void sendUserMessage(prompt)
    },
    [sendUserMessage]
  )

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary shadow-lg shadow-primary/30 transition-all hover:scale-105",
          isOpen && "hidden"
        )}
        size="icon"
        aria-label="Open career assistant chat"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {isOpen && (
        <Card
          className={cn(
            "fixed bottom-6 right-6 z-50 flex w-[min(390px,calc(100vw-3rem))] flex-col overflow-hidden",
            "h-[min(580px,calc(100vh-3rem))] max-h-[90vh] border-border/60 bg-background/95 shadow-2xl backdrop-blur"
          )}
        >
          <CardHeader className="shrink-0 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
            <div className="flex flex-row items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Career Assistant</CardTitle>
                  <p className="truncate text-xs text-muted-foreground">
                    Online now • Ask anything career related
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <ChatContainer
              messages={messages}
              isLoading={isLoading}
              onQuickPrompt={handleQuickPrompt}
              scrollAnchorRef={scrollAnchorRef}
            />
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={() => void onSubmit()}
              disabled={isLoading}
            />
          </CardContent>
        </Card>
      )}
    </>
  )
}
