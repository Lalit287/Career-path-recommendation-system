"use client"

import { motion } from "framer-motion"
import { Bot, Loader2 } from "lucide-react"

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex min-w-0 gap-3"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary" aria-hidden>
        <Bot className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="min-w-0 max-w-[min(85%,100%)] rounded-2xl border bg-background px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          <span className="break-words">Assistant is typing...</span>
        </div>
      </div>
    </motion.div>
  )
}
