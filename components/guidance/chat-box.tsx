"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageBubble } from "./message-bubble"
import type { GuidanceMessage } from "./types"
import { Bot, Loader2, Send, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export const QUICK_QUESTIONS = [
  "Best careers for coding?",
  "How do I switch careers from a non-tech field?",
  "What skills should I learn next for data roles?",
  "How do I prepare for tech interviews?",
]

type ChatBoxProps = {
  messages: GuidanceMessage[]
  isLoading: boolean
  chatInput: string
  onChatInputChange: (value: string) => void
  onSendChat: () => void
  onQuickQuestion: (question: string) => void
  onClearChat: () => void
  sendDisabled: boolean
}

export function ChatBox({
  messages,
  isLoading,
  chatInput,
  onChatInputChange,
  onSendChat,
  onQuickQuestion,
  onClearChat,
  sendDisabled,
}: ChatBoxProps) {
  const scrollAnchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })
  }, [messages, isLoading])

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-indigo-100/80 bg-white/90 shadow-lg shadow-indigo-500/5 backdrop-blur dark:border-indigo-900/40 dark:bg-card/95">
      <CardHeader className="shrink-0 flex-row items-center justify-between space-y-0 border-b border-indigo-100/60 pb-4 dark:border-indigo-900/50">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white dark:bg-indigo-500">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg text-indigo-950 dark:text-indigo-50">AI career coach</CardTitle>
            <p className="text-xs text-muted-foreground">Ask follow-up questions anytime</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onClearChat}
            aria-label="Clear conversation"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-4 pt-2">
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-indigo-100/50 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20",
            "[scrollbar-gutter:stable]"
          )}
          style={{ maxHeight: "min(480px, 55vh)" }}
          role="log"
          aria-label="Guidance chat messages"
        >
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
              <p className="max-w-sm">
                Fill out your profile on the left and click <strong className="text-foreground">Get Guidance</strong> to
                start. Your conversation will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m, i) => (
                <MessageBubble key={m.id} message={m} index={i} />
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm dark:border-indigo-900/50 dark:bg-card"
                  aria-live="polite"
                >
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <span>AI is thinking...</span>
                </motion.div>
              )}
              <div ref={scrollAnchorRef} className="h-px w-full shrink-0" aria-hidden />
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onQuickQuestion(q)}
                disabled={sendDisabled}
                className="rounded-full border border-indigo-200/80 bg-white px-3 py-1.5 text-left text-xs text-indigo-900 transition hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-100 dark:hover:bg-indigo-900/50"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <form
          className="flex shrink-0 gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            onSendChat()
          }}
        >
          <Input
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            placeholder="Continue the conversation..."
            disabled={sendDisabled}
            className="min-w-0 flex-1 rounded-xl border-indigo-100 dark:border-indigo-900/50"
            aria-label="Message"
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            disabled={sendDisabled || !chatInput.trim()}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
