import { getCareersList } from "@/lib/careers-data"
import {
  isProviderCoolingDown,
  noteProviderFailure,
  noteProviderSuccess,
  runInProviderQueue,
  tryAcquireProviderSlot,
} from "@/lib/ai-guardrails"

const CAREER_KEYWORDS = [
  "career", "job", "skill", "salary", "roadmap", "learn", "developer", "engineer",
  "designer", "analyst", "manager", "scientist", "programming", "coding", "tech",
  "technology", "work", "profession", "industry", "hire", "hiring", "interview",
  "resume", "portfolio", "experience", "education", "degree", "certification",
  "course", "training", "mentor", "advice", "guide", "path", "growth", "future",
  "AI", "web", "data", "cloud", "cyber", "security", "product", "UX", "UI",
  "devops", "frontend", "backend", "fullstack", "machine learning", "python",
  "javascript", "react", "node", "database", "sql", "navigate", "page", "website",
  "feature", "help", "how", "what", "where", "recommend", "suggest", "compare",
]

const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.0-flash-lite-001",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash",
].filter((m): m is string => Boolean(m && m.trim()))

const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_FALLBACK,
  process.env.GEMINI_API_KEY_FALLBACK_2,
  process.env.GEMINI_API_KEY_FALLBACK_3,
].filter((k): k is string => Boolean(k && k.trim()))

const BYTEZ_API_KEY = process.env.BYTEZ_API_KEY?.trim()
const BYTEZ_MODEL = process.env.BYTEZ_MODEL?.trim() || "openai/gpt-4.1-mini"
const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim()
const GROQ_MODEL_CANDIDATES = [
  process.env.GROQ_MODEL,
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
].filter((m, idx, arr): m is string => Boolean(m && m.trim()) && arr.indexOf(m) === idx)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim()
const DEFAULT_OPENROUTER_FREE_MODEL = "google/gemma-3-27b-it:free"
const OPENROUTER_MODEL = (() => {
  const configured = process.env.OPENROUTER_MODEL?.trim()
  return configured && configured.endsWith(":free")
    ? configured
    : DEFAULT_OPENROUTER_FREE_MODEL
})()
const OPENROUTER_FREE_MODELS = (() => {
  const configured = (process.env.OPENROUTER_FREE_MODELS || "")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0 && m.endsWith(":free"))

  const deduped = new Set<string>([OPENROUTER_MODEL, ...configured])
  return Array.from(deduped)
})()
const OPENROUTER_REFERER =
  process.env.OPENROUTER_REFERER?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim()
const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE?.trim() || "PathFinder"
const MAX_PROVIDER_CALLS_PER_REQUEST = 4
const MAX_GROQ_MODELS_PER_REQUEST = 1
const GROQ_RATE_LIMIT_PER_MINUTE = 24
const GROQ_COOLDOWN_MS = 45_000
const GROQ_COOLDOWN_FAILURE_THRESHOLD = 2
const GROQ_PROVIDER_TIMEOUT_MS = 12000
const GEMINI_PROVIDER_TIMEOUT_MS = 15000
const OPENROUTER_PROVIDER_TIMEOUT_MS = 15000
const CHAT_CACHE_TTL_MS = 2 * 60 * 1000
const CHAT_CACHE_MAX_ENTRIES = 250

let geminiKeyCursor = 0
const chatResponseCache = new Map<string, { content: string; expiresAt: number }>()

type GeminiMessage = {
  role: "user" | "model"
  parts: Array<{ text: string }>
}

function getRotatedGeminiKeys(): string[] {
  if (GEMINI_API_KEYS.length <= 1) return GEMINI_API_KEYS
  const start = geminiKeyCursor % GEMINI_API_KEYS.length
  geminiKeyCursor = (geminiKeyCursor + 1) % GEMINI_API_KEYS.length
  return [...GEMINI_API_KEYS.slice(start), ...GEMINI_API_KEYS.slice(0, start)]
}

function pruneChatCache(now = Date.now()) {
  for (const [key, value] of chatResponseCache.entries()) {
    if (value.expiresAt <= now) {
      chatResponseCache.delete(key)
    }
  }
  while (chatResponseCache.size > CHAT_CACHE_MAX_ENTRIES) {
    const firstKey = chatResponseCache.keys().next().value
    if (!firstKey) break
    chatResponseCache.delete(firstKey)
  }
}

function buildChatCacheKey(lastMessage: string, incomingMessages: any[]): string {
  const tail = incomingMessages
    .slice(-4)
    .map((m: any) => `${m?.role === "assistant" ? "assistant" : "user"}:${messageText(m)}`)
    .join("\n")
  return `${lastMessage.trim()}\n${tail}`.toLowerCase().slice(0, 4000)
}

function isCareerRelated(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  return CAREER_KEYWORDS.some((keyword) => lowerMessage.includes(keyword.toLowerCase()))
}

function messageText(msg: any): string {
  if (typeof msg?.content === "string") return msg.content
  if (Array.isArray(msg?.parts)) {
    return msg.parts
      .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
      .filter(Boolean)
      .join("\n")
  }
  return ""
}

function extractTextFromBytezOutput(value: any): string {
  if (!value) return ""
  if (typeof value === "string") return value.trim()

  if (Array.isArray(value)) {
    return value
      .map((item) => extractTextFromBytezOutput(item))
      .filter(Boolean)
      .join("\n")
      .trim()
  }

  if (typeof value === "object") {
    const candidateKeys = ["text", "content", "output_text", "message", "result"]
    for (const key of candidateKeys) {
      const text = extractTextFromBytezOutput((value as Record<string, unknown>)[key])
      if (text) return text
    }
  }

  return ""
}

async function runBytezChat(params: {
  systemPrompt: string
  incomingMessages: any[]
  lastMessage: string
}): Promise<string | null> {
  if (!BYTEZ_API_KEY) return null

  try {
    const { default: Bytez } = await import("bytez.js")
    const sdk = new Bytez(BYTEZ_API_KEY)
    const model = sdk.model(BYTEZ_MODEL)

    const recentMessages = params.incomingMessages
      .slice(-8)
      .map((m: any) => ({
        role: m?.role === "assistant" ? "assistant" : "user",
        content: messageText(m),
      }))
      .filter((m: any) => typeof m.content === "string" && m.content.trim().length > 0)

    if (recentMessages.length === 0) {
      recentMessages.push({ role: "user", content: params.lastMessage })
    }

    const payload = [{ role: "system", content: params.systemPrompt }, ...recentMessages]

    const { error, output } = await model.run(payload)
    if (error) {
      console.error("Bytez API error:", error)
      return null
    }

    const text = extractTextFromBytezOutput(output)
    return text || null
  } catch (error) {
    console.error("Bytez fallback error:", error)
    return null
  }
}

async function runGroqChat(params: {
  systemPrompt: string
  incomingMessages: any[]
  lastMessage: string
}): Promise<string | null> {
  if (!GROQ_API_KEY) return null
  if (isProviderCoolingDown("groq-chat")) return null

  try {
    const recentMessages = params.incomingMessages
      .slice(-8)
      .map((m: any) => ({
        role: m?.role === "assistant" ? "assistant" : "user",
        content: messageText(m),
      }))
      .filter((m: any) => typeof m.content === "string" && m.content.trim().length > 0)

    if (recentMessages.length === 0) {
      recentMessages.push({ role: "user", content: params.lastMessage })
    }

    for (const groqModel of GROQ_MODEL_CANDIDATES.slice(0, MAX_GROQ_MODELS_PER_REQUEST)) {
      if (!tryAcquireProviderSlot("groq-chat", GROQ_RATE_LIMIT_PER_MINUTE)) {
        console.warn("Groq chat skipped due to local RPM guard")
        return null
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), GROQ_PROVIDER_TIMEOUT_MS)

      let response: Response
      try {
        response = await runInProviderQueue("groq-chat", () =>
          fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: groqModel,
              messages: [{ role: "system", content: params.systemPrompt }, ...recentMessages],
              temperature: 0.5,
              max_completion_tokens: 900,
            }),
            signal: controller.signal,
          })
        )
      } catch {
        continue
      } finally {
        clearTimeout(timeout)
      }

      if (!response.ok) {
        noteProviderFailure({
          providerId: "groq-chat",
          statusCode: response.status,
          cooldownMs: GROQ_COOLDOWN_MS,
          failureThreshold: GROQ_COOLDOWN_FAILURE_THRESHOLD,
        })
        console.error(`Groq chat error (${groqModel}):`, await response.text())
        continue
      }

      noteProviderSuccess("groq-chat")

      const data = await response.json()
      const choice = data?.choices?.[0]
      const text = typeof choice?.message?.content === "string" ? choice.message.content.trim() : ""
      if (!text) continue

      if (choice?.finish_reason === "length") {
        if (!tryAcquireProviderSlot("groq-chat", GROQ_RATE_LIMIT_PER_MINUTE)) {
          return text
        }

        const continuationController = new AbortController()
        const continuationTimeout = setTimeout(() => continuationController.abort(), GROQ_PROVIDER_TIMEOUT_MS)
        try {
          const continuationResponse = await runInProviderQueue("groq-chat", () =>
            fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${GROQ_API_KEY}`,
              },
              body: JSON.stringify({
                model: groqModel,
                messages: [
                  { role: "system", content: params.systemPrompt },
                  ...recentMessages,
                  { role: "assistant", content: text },
                  {
                    role: "user",
                    content: "Continue exactly from where you stopped. Return only continuation text without repeating prior lines.",
                  },
                ],
                temperature: 0.4,
                max_completion_tokens: 500,
              }),
              signal: continuationController.signal,
            })
          )

          if (continuationResponse.ok) {
            noteProviderSuccess("groq-chat")
            const continuationData = await continuationResponse.json()
            const continuation = continuationData?.choices?.[0]?.message?.content
            if (typeof continuation === "string" && continuation.trim().length > 0) {
              return `${text}\n${continuation.trim()}`
            }
          } else {
            noteProviderFailure({
              providerId: "groq-chat",
              statusCode: continuationResponse.status,
              cooldownMs: GROQ_COOLDOWN_MS,
              failureThreshold: GROQ_COOLDOWN_FAILURE_THRESHOLD,
            })
          }
        } finally {
          clearTimeout(continuationTimeout)
        }
      }

      return text
    }

    return null
  } catch (error) {
    console.error("Groq primary error:", error)
    return null
  }
}

async function runOpenRouterChat(params: {
  systemPrompt: string
  incomingMessages: any[]
  lastMessage: string
}): Promise<string | null> {
  if (!OPENROUTER_API_KEY) return null

  try {
    const recentMessages = params.incomingMessages
      .slice(-8)
      .map((m: any) => ({
        role: m?.role === "assistant" ? "assistant" : "user",
        content: messageText(m),
      }))
      .filter((m: any) => typeof m.content === "string" && m.content.trim().length > 0)

    if (recentMessages.length === 0) {
      recentMessages.push({ role: "user", content: params.lastMessage })
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    }
    if (OPENROUTER_REFERER) headers["HTTP-Referer"] = OPENROUTER_REFERER
    if (OPENROUTER_TITLE) headers["X-OpenRouter-Title"] = OPENROUTER_TITLE

    for (const openRouterModel of OPENROUTER_FREE_MODELS) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), OPENROUTER_PROVIDER_TIMEOUT_MS)
      let response: Response
      try {
        response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: openRouterModel,
            messages: [{ role: "system", content: params.systemPrompt }, ...recentMessages],
            temperature: 0.5,
            max_tokens: 1100,
          }),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeout)
      }

      if (!response.ok) {
        console.error(`OpenRouter chat error (${openRouterModel}):`, await response.text())
        continue
      }

      const data = await response.json()
      const text = data?.choices?.[0]?.message?.content
      if (typeof text === "string" && text.trim().length > 0) {
        return text.trim()
      }
    }

    return null
  } catch (error) {
    console.error("OpenRouter chat fallback error:", error)
    return null
  }
}

function parseAgeFromMessage(message: string): number | null {
  const m = message.match(/age\s*[:=-]\s*(\d{1,3})/i)
  if (!m) return null
  const age = Number(m[1])
  if (!Number.isFinite(age)) return null
  return age
}

function parseProfessionFromMessage(message: string): string | null {
  const m = message.match(/current\s+profession\s*\/\s*role\s*[:=-]\s*([^\n\r]+)/i)
  if (!m) return null
  const profession = m[1].trim()
  return profession.length > 0 ? profession : null
}

function isLikelyNonTechProfession(profession: string): boolean {
  const techKeywords = [
    "developer", "engineer", "programmer", "analyst", "data", "it", "qa", "tester",
    "software", "cloud", "devops", "security", "frontend", "backend", "full stack",
  ]
  const p = profession.toLowerCase()
  return !techKeywords.some((k) => p.includes(k))
}

function difficultyRank(difficulty: string): number {
  const d = difficulty.toLowerCase()
  if (d.includes("beginner") || d.includes("entry")) return 1
  if (d.includes("intermediate")) return 2
  if (d.includes("advanced")) return 3
  if (d.includes("expert") || d.includes("c-suite") || d.includes("executive")) return 4
  return 2
}

function requestedRoleDifficulty(message: string, careers: Array<{ name: string; difficulty: string }>) {
  const msg = message.toLowerCase()
  const matched = careers.filter((c) => msg.includes(c.name.toLowerCase()))

  if (matched.length === 0) {
    if (/ai\s*research|principal|architect|expert|chief|director|ciso|staff\s+engineer/.test(msg)) {
      return { label: "expert", source: "keyword" }
    }
    if (/junior|entry|beginner|intern|trainee/.test(msg)) {
      return { label: "entry", source: "keyword" }
    }
    return { label: "unknown", source: "none" }
  }

  const maxRank = Math.max(...matched.map((c) => difficultyRank(c.difficulty)))
  if (maxRank >= 4) return { label: "expert", source: "catalog" }
  if (maxRank <= 1) return { label: "entry", source: "catalog" }
  return { label: "intermediate", source: "catalog" }
}

async function callGemini(params: {
  apiKey: string
  model: string
  systemPrompt: string
  contents: GeminiMessage[]
  temperature: number
  maxOutputTokens: number
}): Promise<{ ok: true; data: any } | { ok: false; errorText: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEMINI_PROVIDER_TIMEOUT_MS)
  let resp: Response
  try {
    resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(params.model)}:generateContent?key=${encodeURIComponent(params.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: params.systemPrompt }],
          },
          contents: params.contents,
          generationConfig: {
            temperature: params.temperature,
            maxOutputTokens: params.maxOutputTokens,
          },
        }),
        signal: controller.signal,
      }
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!resp.ok) {
    return { ok: false, errorText: await resp.text() }
  }

  return { ok: true, data: await resp.json() }
}

function extractGeminiText(data: any): { text: string; finishReason: string } {
  const candidate = data?.candidates?.[0]
  const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : []
  const text = parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim()

  const finishReason = typeof candidate?.finishReason === "string" ? candidate.finishReason : ""
  return { text, finishReason }
}

function seemsIncompleteEnding(text: string, finishReason: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (finishReason === "MAX_TOKENS") return true

  const endsWithSentencePunctuation = /[.!?]$/.test(trimmed)
  if (!endsWithSentencePunctuation && trimmed.length > 80) return true

  // Detect common dangling endings that look abruptly cut.
  return /(?:\b(and|or|but|so|because|with|for|to|of|in|on|at)\s*)$|[,;:-]$/.test(trimmed.toLowerCase())
}

function trimToCompleteBoundary(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed

  const lastSentenceEnd = Math.max(
    trimmed.lastIndexOf("."),
    trimmed.lastIndexOf("!"),
    trimmed.lastIndexOf("?")
  )
  if (lastSentenceEnd >= 40) {
    return trimmed.slice(0, lastSentenceEnd + 1).trim()
  }
  // If we cannot find a reliable sentence boundary, keep the original text
  // to avoid accidentally dropping complete list items.
  return trimmed
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const incomingMessages = Array.isArray(body?.messages) ? body.messages : []
    const message =
      typeof body?.message === "string"
        ? body.message
        : (incomingMessages[incomingMessages.length - 1]?.content ?? "")
    const lastMessage = typeof message === "string" ? message : ""

    if (!isCareerRelated(lastMessage)) {
      const hasContext = incomingMessages.length > 1
      if (!hasContext) {
        return Response.json({
          role: "assistant",
          content:
            "I can only assist with career guidance, skills development, and navigating this website. Please ask me about:\n\n- Career recommendations\n- Skills needed for specific roles\n- Salary information\n- Learning roadmaps\n- How to use this platform\n\nHow can I help you with your career journey?",
        })
      }
    }

    const careers = await getCareersList()
    const careersList = careers
      .map((c) => {
        const snippet = c.description.length > 100 ? `${c.description.substring(0, 100)}...` : c.description
        return `- ${c.name}: ${snippet}`
      })
      .join("\n")

    const parsedAge = parseAgeFromMessage(lastMessage)
    const parsedProfession = parseProfessionFromMessage(lastMessage)
    const midLifeNonTech =
      parsedAge !== null &&
      parsedAge >= 35 &&
      typeof parsedProfession === "string" &&
      isLikelyNonTechProfession(parsedProfession)

    const roleDifficulty = requestedRoleDifficulty(
      lastMessage,
      careers.map((c) => ({ name: c.name, difficulty: c.difficulty }))
    )

    const dynamicRules = [
      midLifeNonTech
        ? "HARD RULE FOR THIS USER: Present Path A (current-career/business expansion for income stability) BEFORE Path B (career transition)."
        : null,
      roleDifficulty.label === "expert"
        ? "REQUESTED ROLE LEVEL: Expert-level target detected. You must label it as long-term and first suggest 2-3 nearest entry-level bridge roles."
        : null,
      roleDifficulty.label === "entry"
        ? "REQUESTED ROLE LEVEL: Entry-level target detected. Provide a direct practical path with short milestones."
        : null,
      roleDifficulty.label === "intermediate"
        ? "REQUESTED ROLE LEVEL: Intermediate target detected. Provide staged bridge plan from current profile to this role."
        : null,
    ]
      .filter(Boolean)
      .join("\n")

    const systemPrompt = `You are a realistic, practical career guidance assistant for an Indian Career Path Recommendation System.
You answer only career-related questions, learning paths, salary ranges, role comparisons, and website usage.

CORE BEHAVIOR:
1) Reality-first: no over-promising, no false hope, no harsh discouragement.
2) Be transparent about constraints: education, age bias, competition, time, and money.
3) Prioritize low-risk employability and phased transition.
4) Use India-specific context and INR salary framing.

MANDATORY FOR MID-LIFE CAREER CHANGE PROFILES (adult, non-tech background, limited credentials):
1) Give a clear feasibility rating: Easy / Moderate / Hard, with one-line reason.
2) Offer TWO pathways:
- Path A (Stability): improve/expand current career/business and income.
- Path B (Transition): realistic steps into requested new career.
3) For Path B, include realistic timeline range and first target role by hiring probability.
4) Mention top 3 risk factors and one mitigation each.
5) If user asks for advanced fields (AI/ML), place them as later specialization after fundamentals.

RESPONSE LENGTH RULE:
1) Keep default response short: 120-220 words.
2) Use compact bullets only; avoid long essays.
3) End with a single follow-up question:
"Would you like a step-by-step 90-day plan for Path A, Path B, or both?"
4) Only provide long detailed plans when user explicitly asks for them.

DO NOT:
1) Promise guaranteed jobs.
2) Suggest unrealistic immediate jumps.
3) Give generic course dumps without execution steps.
4) Ignore user life-stage context.

AVAILABLE CAREERS ON THIS PLATFORM:
${careersList}

WEBSITE FEATURES:
- Career Recommendation: Multi-step form for personalized suggestions
- Job Roles: Browse and filter role catalog
- Roadmap Generator: Step-by-step learning path
- Career Comparison: Compare roles side by side
- Profile: Save careers and preferences

RUNTIME CONTEXT RULES:
${dynamicRules || "No special runtime rules for this message."}`

    pruneChatCache()
    const cacheKey = buildChatCacheKey(lastMessage, incomingMessages)
    const cached = chatResponseCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return Response.json({ role: "assistant", content: cached.content })
    }

    const groqText = await runGroqChat({
      systemPrompt,
      incomingMessages,
      lastMessage,
    })

    if (groqText) {
      chatResponseCache.set(cacheKey, {
        content: groqText,
        expiresAt: Date.now() + CHAT_CACHE_TTL_MS,
      })
      return Response.json({ role: "assistant", content: groqText })
    }

    let geminiData: any = null
    let lastErrorText = ""
    let selectedApiKey: string | null = null
    let selectedModel: string | null = null
    let selectedRecentMessages: GeminiMessage[] = []

    let providerCalls = 0
    if (GEMINI_API_KEYS.length > 0) {
      requestLoop:
      for (const apiKey of getRotatedGeminiKeys()) {
        for (const model of MODEL_CANDIDATES) {
          if (providerCalls >= MAX_PROVIDER_CALLS_PER_REQUEST) break requestLoop
          providerCalls++

          const recentMessages: GeminiMessage[] = incomingMessages
            .slice(-8)
            .map((m: any) => ({
              role: m?.role === "assistant" ? "model" : "user",
              parts: [{ text: messageText(m) }],
            }))
            .filter((m: GeminiMessage) => m.parts[0].text && m.parts[0].text.trim().length > 0)

          if (recentMessages.length === 0) {
            recentMessages.push({ role: "user", parts: [{ text: lastMessage }] })
          }

          const result = await callGemini({
            apiKey,
            model,
            systemPrompt,
            contents: recentMessages,
            temperature: 0.5,
            maxOutputTokens: 1100,
          })

          if (result.ok) {
            geminiData = result.data
            selectedApiKey = apiKey
            selectedModel = model
            selectedRecentMessages = recentMessages
            break requestLoop
          }

          lastErrorText = result.errorText
          console.error(`Gemini API error with model ${model}:`, lastErrorText)
        }
      }
    }

    if (!geminiData) {
      console.error("Gemini API final failure:", lastErrorText)

      const openRouterText = await runOpenRouterChat({
        systemPrompt,
        incomingMessages,
        lastMessage,
      })

      if (openRouterText) {
        chatResponseCache.set(cacheKey, {
          content: openRouterText,
          expiresAt: Date.now() + CHAT_CACHE_TTL_MS,
        })
        return Response.json({ role: "assistant", content: openRouterText })
      }

      const bytezText = await runBytezChat({
        systemPrompt,
        incomingMessages,
        lastMessage,
      })

      if (bytezText) {
        chatResponseCache.set(cacheKey, {
          content: bytezText,
          expiresAt: Date.now() + CHAT_CACHE_TTL_MS,
        })
        return Response.json({ role: "assistant", content: bytezText })
      }

      return Response.json({
        role: "assistant",
        content: "I couldn't process that right now. Please try again in a moment.",
      })
    }

    const extracted = extractGeminiText(geminiData)
    let finalText =
      extracted.text.length > 0
        ? extracted.text
        : "I couldn't generate a response right now. Please try rephrasing your question."

    const trimmedFinal = finalText.trim()
    const looksCutOff = seemsIncompleteEnding(trimmedFinal, extracted.finishReason)
    let recoveredFromCutoff = false

    if (looksCutOff && selectedApiKey && selectedModel) {
      const continuationResult = await callGemini({
        apiKey: selectedApiKey,
        model: selectedModel,
        systemPrompt,
        contents: [
          ...selectedRecentMessages,
          { role: "model", parts: [{ text: trimmedFinal }] },
          {
            role: "user",
            parts: [
              {
                text: "Continue exactly from where you stopped. Return only the continuation text without repeating previous content.",
              },
            ],
          },
        ],
        temperature: 0.4,
        maxOutputTokens: 800,
      })

      if (continuationResult.ok) {
        const continuation = extractGeminiText(continuationResult.data).text
        if (continuation.trim().length > 0) {
          finalText = `${trimmedFinal}\n${continuation.trim()}`
          recoveredFromCutoff = true
        } else {
          finalText = trimmedFinal
        }
      } else {
        finalText = trimmedFinal
      }
    }

    if (looksCutOff && !recoveredFromCutoff) {
      const openRouterRecovery = await runOpenRouterChat({
        systemPrompt,
        incomingMessages,
        lastMessage,
      })

      if (openRouterRecovery) {
        finalText = openRouterRecovery
      } else {
        const bytezRecovery = await runBytezChat({
          systemPrompt,
          incomingMessages,
          lastMessage,
        })
        if (bytezRecovery) {
          finalText = bytezRecovery
        }
      }
    }

    // Never return visibly cut mid-sentence text to the guidance UI.
    if (seemsIncompleteEnding(finalText, "")) {
      finalText = trimToCompleteBoundary(finalText)
    }

    chatResponseCache.set(cacheKey, {
      content: finalText,
      expiresAt: Date.now() + CHAT_CACHE_TTL_MS,
    })

    return Response.json({ role: "assistant", content: finalText })
  } catch (error) {
    console.error("Chat error:", error)
    return Response.json({ error: "Failed to process chat request" }, { status: 500 })
  }
}
