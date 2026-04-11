"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

type ChatInputProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
  placeholder?: string
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Ask about careers...",
}: ChatInputProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex shrink-0 items-center gap-2 border-t bg-background p-3"
    >
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-xl border-border/70"
        disabled={disabled}
        autoComplete="off"
        aria-label="Chat message"
      />
      <Button
        type="submit"
        size="icon"
        className="shrink-0 rounded-xl"
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  )
}
