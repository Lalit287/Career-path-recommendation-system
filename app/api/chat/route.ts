import { getCareersList } from "@/lib/careers-data"

const CAREER_KEYWORDS = [
  "career", "job", "skill", "salary", "roadmap", "learn", "developer", "engineer",
  "designer", "analyst", "manager", "scientist", "programming", "coding", "tech",
  "technology", "work", "profession", "industry", "hire", "hiring", "interview",
  "resume", "portfolio", "experience", "education", "degree", "certification",
  "course", "training", "mentor", "advice", "guide", "path", "growth", "future",
  "AI", "web", "data", "cloud", "cyber", "security", "product", "UX", "UI",
  "devops", "frontend", "backend", "fullstack", "machine learning", "python",
  "javascript", "react", "node", "database", "sql", "navigate", "page", "website",
  "feature", "help", "how", "what", "where", "recommend", "suggest", "compare"
]

const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
].filter((m): m is string => Boolean(m && m.trim()))

function isCareerRelated(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  return CAREER_KEYWORDS.some(keyword => lowerMessage.includes(keyword.toLowerCase()))
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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const incomingMessages = Array.isArray(body?.messages) ? body.messages : []
    const message =
      typeof body?.message === "string"
        ? body.message
        : (incomingMessages[incomingMessages.length - 1]?.content ?? "")
    const lastMessage = typeof message === "string" ? message : ""

    // Keep guardrail, but allow normal follow-ups in ongoing conversations.
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
        const snippet =
          c.description.length > 100
            ? `${c.description.substring(0, 100)}...`
            : c.description
        return `- ${c.name}: ${snippet}`
      })
      .join("\n")

    const systemPrompt = `You are a helpful career guidance assistant for a Career Path Recommendation System website.
You answer career-related questions, skill paths, roadmap planning, salary ranges, and website usage.
If a role is not explicitly listed in the platform data, do NOT stop at "not available".
Instead always:
1) Give practical guidance for that role.
2) Suggest 2-4 closest available roles from platform data.
3) Provide next steps and must-have skills.
Be conversational, specific, and action-oriented.
For role guidance questions, respond in this compact structure:
- What this role does (2-3 lines)
- Skills to learn first (4-6 bullets)
- 30/60/90 day starter plan (3 bullets)
- Closest roles on this platform

Scope of support:
1. Career paths and job roles
2. Skills and learning resources
3. Salary information
4. Career roadmaps and development
5. Website navigation and features

Available careers on this platform:
${careersList}

Website features you can help with:
- Career Recommendation: Multi-step form to get personalized career suggestions
- Job Roles: Browse and filter all available career paths
- Roadmap Generator: Get step-by-step learning paths for any career
- Career Comparison: Compare multiple careers side by side
- Profile: Save careers and manage your preferences

Keep responses concise, helpful, and focused on career guidance. If a question is not related to careers or the website, politely redirect to career topics.`

    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      return Response.json({
        role: "assistant",
        content:
          "Chat is not configured yet. Please add GEMINI_API_KEY in .env.local and restart the server.",
      })
    }

    let geminiData: any = null
    let lastErrorText = ""

    for (const model of MODEL_CANDIDATES) {
      const recentMessages = incomingMessages
        .slice(-8)
        .map((m: any) => ({
          role: m?.role === "assistant" ? "model" : "user",
          parts: [{ text: messageText(m) }],
        }))
        .filter((m: any) => m.parts[0].text && m.parts[0].text.trim().length > 0)

      if (recentMessages.length === 0) {
        recentMessages.push({ role: "user", parts: [{ text: lastMessage }] })
      }

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: recentMessages,
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 600,
            },
          }),
        }
      )

      if (geminiResponse.ok) {
        geminiData = await geminiResponse.json()
        break
      }

      lastErrorText = await geminiResponse.text()
      console.error(`Gemini API error with model ${model}:`, lastErrorText)
    }

    if (!geminiData) {
      console.error("Gemini API final failure:", lastErrorText)
      return Response.json({
        role: "assistant",
        content:
          "I couldn't process that right now. Please try again in a moment.",
      })
    }

    const candidate = geminiData?.candidates?.[0]
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : []
    const content = parts
      .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim()

    const finalText =
      content.length > 0
        ? content
        : "I couldn't generate a response right now. Please try rephrasing your question."

    return Response.json({
      role: "assistant",
      content: finalText,
    })
  } catch (error) {
    console.error("Chat error:", error)
    return Response.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    )
  }
}
