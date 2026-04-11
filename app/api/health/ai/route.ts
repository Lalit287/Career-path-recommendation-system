import { NextResponse } from "next/server"

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash"
const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_FALLBACK,
  process.env.GEMINI_API_KEY_FALLBACK_2,
  process.env.GEMINI_API_KEY_FALLBACK_3,
].filter((k): k is string => Boolean(k && k.trim()))

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim()
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL?.trim() || "google/gemma-3-27b-it:free"
const OPENROUTER_REFERER =
  process.env.OPENROUTER_REFERER?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  "http://localhost:3000"
const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE?.trim() || "PathFinder"

const BYTEZ_API_KEY = process.env.BYTEZ_API_KEY?.trim()
const BYTEZ_MODEL = process.env.BYTEZ_MODEL?.trim() || "openai/gpt-4.1-mini"

async function checkGeminiKey(apiKey: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Reply exactly with: OK" }] }],
          generationConfig: { maxOutputTokens: 20, temperature: 0 },
        }),
        signal: controller.signal,
      }
    )

    if (!response.ok) {
      return { ok: false, status: response.status }
    }

    return { ok: true, status: 200 }
  } catch {
    return { ok: false, status: 0 }
  } finally {
    clearTimeout(timeout)
  }
}

async function checkOpenRouter() {
  if (!OPENROUTER_API_KEY) return { configured: false, ok: false, status: 0 }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": OPENROUTER_REFERER,
        "X-OpenRouter-Title": OPENROUTER_TITLE,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: "user", content: "Reply exactly with: OK" }],
        max_tokens: 20,
        temperature: 0,
      }),
      signal: controller.signal,
    })

    return {
      configured: true,
      ok: response.ok,
      status: response.status,
      rateLimit: {
        limit: response.headers.get("x-ratelimit-limit"),
        remaining: response.headers.get("x-ratelimit-remaining"),
      },
    }
  } catch {
    return { configured: true, ok: false, status: 0 }
  } finally {
    clearTimeout(timeout)
  }
}

async function checkBytez() {
  if (!BYTEZ_API_KEY) return { configured: false, ok: false }

  try {
    const { default: Bytez } = await import("bytez.js")
    const sdk = new Bytez(BYTEZ_API_KEY)
    const model = sdk.model(BYTEZ_MODEL)
    const { error } = await model.run([{ role: "user", content: "Reply exactly with: OK" }])
    return { configured: true, ok: !error }
  } catch {
    return { configured: true, ok: false }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ping = searchParams.get("ping") === "1"

  if (!ping) {
    return NextResponse.json({
      mode: "config-only",
      gemini: {
        model: GEMINI_MODEL,
        keyCount: GEMINI_KEYS.length,
      },
      openrouter: {
        model: OPENROUTER_MODEL,
        configured: Boolean(OPENROUTER_API_KEY),
      },
      bytez: {
        model: BYTEZ_MODEL,
        configured: Boolean(BYTEZ_API_KEY),
      },
      usage: "Add ?ping=1 to run live provider checks.",
    })
  }

  const geminiChecks = await Promise.all(GEMINI_KEYS.map((k) => checkGeminiKey(k)))
  const openrouterCheck = await checkOpenRouter()
  const bytezCheck = await checkBytez()

  return NextResponse.json({
    mode: "live-ping",
    gemini: {
      model: GEMINI_MODEL,
      keyCount: GEMINI_KEYS.length,
      checks: geminiChecks,
      healthyKeys: geminiChecks.filter((c) => c.ok).length,
    },
    openrouter: {
      model: OPENROUTER_MODEL,
      ...openrouterCheck,
    },
    bytez: {
      model: BYTEZ_MODEL,
      ...bytezCheck,
    },
    overallHealthy:
      geminiChecks.some((c) => c.ok) ||
      Boolean(openrouterCheck.ok) ||
      Boolean(bytezCheck.ok),
  })
}
