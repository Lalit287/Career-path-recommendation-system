"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const quickPrompts = [
  "Suggest careers for me",
  "What skills are needed for AI Engineer?",
  "How do I use this website?",
  "Compare web dev and data science",
]

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const safeMessages = Array.isArray(messages) ? messages : []
  const safeInput = input
  const safeIsLoading = isLoading

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [safeMessages])

  const sendUserMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || safeIsLoading) return

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user" as const,
      content: trimmed,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          messages: [...safeMessages, userMessage],
        }),
      })

      const data = await response.json()
      const assistantText =
        typeof data?.content === "string"
          ? data.content
          : "I couldn't generate a response right now. Please try again."

      setMessages((prev) => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: "assistant", content: assistantText },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Network issue while contacting chat service. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    await sendUserMessage(safeInput)
    setInput("")
  }

  const handleQuickPrompt = async (prompt: string) => {
    await sendUserMessage(prompt)
  }

  const timeLabel = () =>
    new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date())

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary shadow-lg shadow-primary/30 transition-all hover:scale-105",
          isOpen && "hidden"
        )}
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {isOpen && (
        <Card className="fixed bottom-6 right-6 z-50 flex h-[580px] w-[390px] flex-col overflow-hidden border-border/60 bg-background/95 shadow-2xl backdrop-blur">
          <CardHeader className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
            <div className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Career Assistant</CardTitle>
                  <p className="text-xs text-muted-foreground">Online now • Ask anything career related</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col p-0">
            <ScrollArea ref={scrollRef} className="flex-1 bg-muted/20 p-4">
              {safeMessages.length === 0 ? (
                <div className="space-y-4">
                  <div className="mx-auto max-w-[90%] rounded-2xl border bg-background p-4 text-sm shadow-sm">
                    <div className="mb-2 flex items-center gap-2 font-medium">
                      <Bot className="h-4 w-4 text-primary" />
                      Welcome
                    </div>
                    <p className="text-muted-foreground">
                      Hi! I&apos;m your AI career assistant. I can help with role selection, skill gaps,
                      roadmaps, and salary insights.
                    </p>
                  </div>
                  <div className="space-y-2 px-1">
                    <p className="text-xs font-medium text-muted-foreground">Try asking:</p>
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleQuickPrompt(prompt)}
                        disabled={safeIsLoading}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-left text-xs transition hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {safeMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" && "flex-row-reverse"
                      )}
                    >
                      <div className={cn("mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", message.role === "user" ? "bg-secondary" : "bg-primary")}>
                        {message.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4 text-primary-foreground" />
                        )}
                      </div>
                      <div
                        className={cn(
                          "max-w-[78%] rounded-2xl px-3 py-2.5 text-sm shadow-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "border bg-background"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className={cn("mt-1 text-[10px]", message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {timeLabel()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {safeIsLoading && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="rounded-2xl border bg-background px-3 py-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Thinking...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <form onSubmit={onSubmit} className="flex items-center gap-2 border-t bg-background p-3">
              <Input
                value={safeInput}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about careers..."
                className="flex-1 rounded-xl border-border/70"
                disabled={safeIsLoading}
              />
              <Button
                type="submit"
                size="icon"
                className="rounded-xl"
                disabled={safeIsLoading || !safeInput.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  )
}
