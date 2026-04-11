"use client"

import { motion } from "framer-motion"
import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import type { ChatMessageModel } from "./types"

function formatTime(ts: number) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(
    new Date(ts)
  )
}

type ChatMessageProps = {
  message: ChatMessageModel
  index: number
}

export function ChatMessage({ message, index }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.15) }}
      className={cn("flex min-w-0 gap-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-secondary" : "bg-primary"
        )}
        aria-hidden
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4 text-primary-foreground" />
        )}
      </div>
      <div
        className={cn(
          "min-w-0 max-w-[min(92%,42rem)] rounded-2xl px-3.5 py-3 text-sm shadow-sm",
          isUser ? "bg-primary text-primary-foreground" : "border bg-background"
        )}
      >
        {isUser ? (
          <p
            className="break-words [overflow-wrap:anywhere] whitespace-pre-wrap"
            style={{ wordBreak: "break-word" }}
          >
            {message.content}
          </p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed prose-p:my-1.5 prose-li:my-0.5 prose-ul:my-1.5 prose-ol:my-1.5 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:list-inside [&_ol]:list-inside [&_ul]:pl-0 [&_ol]:pl-0">
            <ReactMarkdown>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        <p
          className={cn(
            "mt-1 text-[10px]",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </motion.div>
  )
}
