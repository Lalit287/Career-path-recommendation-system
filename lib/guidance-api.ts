import type { GuidanceMessage } from "@/components/guidance/types"

function parseJsonSafe(text: string): Record<string, unknown> {
  if (!text.trim()) return {}
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return {}
  }
}

const FALLBACK = "Something went wrong. Please try again."

export type GuidanceChatResult =
  | { status: "success"; content: string }
  | { status: "error"; content: string }
  | { status: "aborted" }

export async function requestGuidanceChat(params: {
  message: string
  history: GuidanceMessage[]
  signal?: AbortSignal
}): Promise<GuidanceChatResult> {
  const { message, history, signal } = params
  const messagesPayload = history.map(({ id, role, content }) => ({ id, role, content }))

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, messages: messagesPayload }),
      signal,
    })
    const raw = await response.text()
    const data = parseJsonSafe(raw)

    if (!response.ok) {
      const err = data.error
      const text =
        typeof err === "string" && err.trim()
          ? err
          : FALLBACK
      return { status: "error", content: text }
    }

    const content = data.content
    if (typeof content === "string" && content.trim()) {
      return { status: "success", content }
    }
    return { status: "error", content: FALLBACK }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { status: "aborted" }
    }
    return { status: "error", content: FALLBACK }
  }
}
