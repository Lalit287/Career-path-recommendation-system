"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { UserForm, EDUCATION_OPTIONS } from "./user-form"
import { ChatBox } from "./chat-box"
import { buildGuidancePrompt } from "./build-prompt"
import type { GuidanceFormState, GuidanceMessage } from "./types"
import { requestGuidanceChat } from "@/lib/guidance-api"
import { toast } from "sonner"

const STORAGE_KEY = "careerpath-guidance-v1"

const defaultForm: GuidanceFormState = {
  interestTags: [],
  age: "",
  profession: "",
  skills: "",
  education: EDUCATION_OPTIONS[2]?.value ?? "Bachelor's degree",
  goals: "",
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function GuidancePage() {
  const [form, setForm] = useState<GuidanceFormState>(defaultForm)
  const [interestDraft, setInterestDraft] = useState("")
  const [messages, setMessages] = useState<GuidanceMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const messagesRef = useRef<GuidanceMessage[]>([])
  const pendingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  messagesRef.current = messages

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw) as {
          messages?: GuidanceMessage[]
          form?: Partial<GuidanceFormState>
        }
        if (Array.isArray(data.messages)) {
          setMessages(data.messages)
        }
        if (data.form && typeof data.form === "object") {
          setForm((prev) => ({
            ...prev,
            ...data.form,
            interestTags: Array.isArray(data.form?.interestTags)
              ? data.form.interestTags
              : prev.interestTags,
            age: typeof data.form?.age === "string" ? data.form.age : prev.age,
            profession:
              typeof data.form?.profession === "string" ? data.form.profession : prev.profession,
            skills: typeof data.form?.skills === "string" ? data.form.skills : prev.skills,
            education: typeof data.form?.education === "string" ? data.form.education : prev.education,
            goals: typeof data.form?.goals === "string" ? data.form.goals : prev.goals,
          }))
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, form }))
    } catch {
      /* ignore */
    }
  }, [messages, form, hydrated])

  const addInterestTag = useCallback(() => {
    const t = interestDraft.trim()
    if (!t) return
    setForm((prev) => ({
      ...prev,
      interestTags: prev.interestTags.includes(t) ? prev.interestTags : [...prev.interestTags, t],
    }))
    setInterestDraft("")
  }, [interestDraft])

  const onInterestKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        addInterestTag()
      }
    },
    [addInterestTag]
  )

  const removeTag = useCallback((tag: string) => {
    setForm((prev) => ({ ...prev, interestTags: prev.interestTags.filter((x) => x !== tag) }))
  }, [])

  const runChatTurn = useCallback(async (userText: string) => {
    const trimmed = userText.trim()
    if (!trimmed || pendingRef.current) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    pendingRef.current = true
    setIsLoading(true)

    const userMessage: GuidanceMessage = {
      id: makeId("user"),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    const historyForApi = [...messagesRef.current, userMessage]

    try {
      const result = await requestGuidanceChat({
        message: trimmed,
        history: historyForApi,
        signal: controller.signal,
      })

      if (result.status === "aborted") return

      const assistantText = result.content

      setMessages((prev) => [
        ...prev,
        {
          id: makeId("assistant"),
          role: "assistant",
          content: assistantText,
          createdAt: Date.now(),
        },
      ])
    } finally {
      if (abortRef.current === controller) {
        pendingRef.current = false
        setIsLoading(false)
      }
    }
  }, [])

  const handleGetGuidance = useCallback(() => {
    if (isLoading) return

    const ageNum = Number(form.age)
    if (!Number.isInteger(ageNum) || ageNum < 13 || ageNum > 100) {
      toast.error("Enter a valid age between 13 and 100.")
      return
    }

    if (!form.profession.trim()) {
      toast.error("Please enter your current profession or role.")
      return
    }

    const hasInterests = form.interestTags.length > 0
    const hasSkills = form.skills.trim().length > 0
    if (!hasInterests && !hasSkills) {
      toast.error("Add at least one interest tag or describe your skills.")
      return
    }

    const prompt = buildGuidancePrompt(form)
    void runChatTurn(prompt)
  }, [form, isLoading, runChatTurn])

  const handleSendChat = useCallback(() => {
    const t = chatInput.trim()
    if (!t) return
    setChatInput("")
    void runChatTurn(t)
  }, [chatInput, runChatTurn])

  const handleQuickQuestion = useCallback(
    (q: string) => {
      void runChatTurn(q)
    },
    [runChatTurn]
  )

  const handleClearChat = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setChatInput("")
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    toast.success("Conversation cleared")
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-background dark:via-background dark:to-indigo-950/40">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
        <header className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-indigo-950 dark:text-indigo-50 md:text-4xl">
            AI Career Guidance
          </h1>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">
            Get personalized career suggestions based on your interests and skills
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch lg:gap-10">
          <UserForm
            form={form}
            interestDraft={interestDraft}
            onInterestDraftChange={setInterestDraft}
            onAddInterestTag={addInterestTag}
            onInterestKeyDown={onInterestKeyDown}
            onRemoveTag={removeTag}
            onAgeChange={(v) => setForm((p) => ({ ...p, age: v }))}
            onProfessionChange={(v) => setForm((p) => ({ ...p, profession: v }))}
            onSkillsChange={(v) => setForm((p) => ({ ...p, skills: v }))}
            onEducationChange={(v) => setForm((p) => ({ ...p, education: v }))}
            onGoalsChange={(v) => setForm((p) => ({ ...p, goals: v }))}
            onSubmit={handleGetGuidance}
            disabled={isLoading}
          />

          <div className="flex min-h-[min(640px,calc(100vh-12rem))] min-w-0 flex-col lg:min-h-[560px]">
            <ChatBox
              messages={messages}
              isLoading={isLoading}
              chatInput={chatInput}
              onChatInputChange={setChatInput}
              onSendChat={handleSendChat}
              onQuickQuestion={handleQuickQuestion}
              onClearChat={handleClearChat}
              sendDisabled={isLoading}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
