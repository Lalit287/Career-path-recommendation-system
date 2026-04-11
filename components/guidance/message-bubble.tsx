"use client"

import { motion } from "framer-motion"
import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import type { GuidanceMessage } from "./types"

type MessageBubbleProps = {
  message: GuidanceMessage
  index: number
}

export function MessageBubble({ message, index }: MessageBubbleProps) {
  const isUser = message.role === "user"

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.12) }}
      className={cn("flex w-full min-w-0 gap-2", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm dark:bg-indigo-500"
          aria-hidden
        >
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[min(92%,520px)] min-w-0 rounded-2xl px-4 py-3 text-sm shadow-md",
          isUser
            ? "rounded-br-md bg-indigo-600 text-white dark:bg-indigo-500"
            : "rounded-bl-md border border-indigo-100/80 bg-white text-foreground dark:border-indigo-900/50 dark:bg-card"
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
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-headings:font-bold prose-h3:text-sm prose-p:my-1.5 prose-li:my-0.5 prose-ul:my-1.5 prose-ol:my-1.5 [&_ul]:list-disc [&_ol]:list-decimal">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1.5">{children}</h3>,
                h4: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>,
                p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside my-1.5 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside my-1.5 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li className="my-0.5">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => (
                  <code className="bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && (
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
          aria-hidden
        >
          <User className="h-4 w-4" />
        </div>
      )}
    </motion.div>
  )
}
