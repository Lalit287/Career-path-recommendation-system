export type ChatRole = "user" | "assistant"

export type ChatMessageModel = {
  id: string
  role: ChatRole
  content: string
  createdAt: number
}
