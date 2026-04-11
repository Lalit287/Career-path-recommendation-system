import { NextResponse } from "next/server"
import { store, generateId } from "@/lib/store"
import { getCareersList } from "@/lib/careers-data"
import {
  isProviderCoolingDown,
  noteProviderFailure,
  noteProviderSuccess,
  runInProviderQueue,
  tryAcquireProviderSlot,
} from "@/lib/ai-guardrails"

type CurrentStage =
  | "school-10"
  | "intermediate-11-12"
  | "diploma"
  | "ug"
  | "working"
  | "other"

type RoadmapProfileInput = {
  dateOfBirth?: string
  currentStage?: CurrentStage
  qualification?: string
  currentRole?: string
  skills?: string[]
}

const VALID_STAGES: CurrentStage[] = [
  "school-10",
  "intermediate-11-12",
  "diploma",
  "ug",
  "working",
  "other",
]

const ROADMAP_GENERATOR_VERSION = "ai-v1"

const ROADMAP_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.0-flash-lite-001",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash",
].filter((m): m is string => Boolean(m && m.trim()))

const ROADMAP_API_KEYS = [
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

const MAX_ROADMAP_PROVIDER_CALLS = 6
const ROADMAP_PROVIDER_TIMEOUT_MS = 12000
const OPENROUTER_ROADMAP_TIMEOUT_MS = 10000
const BYTEZ_ROADMAP_TIMEOUT_MS = 8000
const GROQ_ROADMAP_TIMEOUT_MS = 10000
const GROQ_RATE_LIMIT_PER_MINUTE = 20
const GROQ_COOLDOWN_MS = 45_000
const GROQ_COOLDOWN_FAILURE_THRESHOLD = 2
const MAX_GROQ_MODELS_PER_REQUEST = 1
const ROADMAP_TOTAL_AI_BUDGET_MS = 18000
const MIN_PROVIDER_ATTEMPT_MS = 1500
const ROADMAP_AI_CACHE_TTL_MS = 10 * 60 * 1000

let roadmapGeminiKeyCursor = 0
const roadmapAiCache = new Map<
  string,
  {
    value: {
      steps: GeneratedStep[]
      pathwaySummary: { primaryPath: string; alternatePath: string }
      provider: "groq" | "gemini" | "openrouter" | "bytez"
    }
    expiresAt: number
  }
>()

type RoadmapResourceTracks = {
  free: string[]
  paid: string[]
}

type GeneratedStep = {
  title: string
  description: string
  duration: string
  resources: string[]
  whyThisStage?: string
  requiredSkills?: string[]
  resourceTracks?: RoadmapResourceTracks
  decisionBreakpoint?: {
    question: string
    passCriteria: string[]
    alternatePath: string
  }
}

function getRotatedRoadmapGeminiKeys(): string[] {
  if (ROADMAP_API_KEYS.length <= 1) return ROADMAP_API_KEYS
  const start = roadmapGeminiKeyCursor % ROADMAP_API_KEYS.length
  roadmapGeminiKeyCursor = (roadmapGeminiKeyCursor + 1) % ROADMAP_API_KEYS.length
  return [...ROADMAP_API_KEYS.slice(start), ...ROADMAP_API_KEYS.slice(0, start)]
}

function pruneRoadmapAiCache(now = Date.now()) {
  for (const [key, value] of roadmapAiCache.entries()) {
    if (value.expiresAt <= now) roadmapAiCache.delete(key)
  }
}

function deriveAge(dateOfBirth?: string): number | undefined {
  if (!dateOfBirth) return undefined
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return undefined
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
  return age >= 0 && age <= 100 ? age : undefined
}

function normalizeProfile(profile?: RoadmapProfileInput): Required<Omit<RoadmapProfileInput, "dateOfBirth">> & { dateOfBirth?: string; age?: number } {
  const stage = profile?.currentStage ?? "other"
  const skills = Array.isArray(profile?.skills) ? profile!.skills!.filter((s) => s.trim().length > 0) : []
  return {
    dateOfBirth: profile?.dateOfBirth,
    age: deriveAge(profile?.dateOfBirth),
    currentStage: stage,
    qualification: (profile?.qualification ?? "").trim(),
    currentRole: (profile?.currentRole ?? "").trim(),
    skills,
  }
}

function buildProfileKey(careerId: string, profile: ReturnType<typeof normalizeProfile>): string {
  const skillsKey = [...profile.skills].sort((a, b) => a.localeCompare(b)).join("|")
  const ageBucket = typeof profile.age === "number" ? `${Math.floor(profile.age / 5) * 5}` : "na"
  return [
    ROADMAP_GENERATOR_VERSION,
    careerId,
    profile.currentStage,
    profile.qualification.toLowerCase(),
    profile.currentRole.toLowerCase(),
    ageBucket,
    skillsKey.toLowerCase(),
  ].join("::")
}

function sumDurationRange(steps: GeneratedStep[]): string {
  let minMonths = 0
  let maxMonths = 0
  let hasFiniteDuration = false
  let hasOngoingDuration = false

  for (const step of steps) {
    const text = step.duration.toLowerCase()
    if (/ongoing|continuous|continuous learning/.test(text)) {
      hasOngoingDuration = true
    }

    // Capture values like: "6 months", "1.5 years", "3-6 months", "6 months - 1 year"
    const parts = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(month|months|year|years)/g)]
    if (parts.length === 0) {
      continue
    }

    const valuesInMonths = parts
      .map((m) => {
        const value = Number(m[1])
        const unit = m[2]
        return unit.startsWith("year") ? value * 12 : value
      })
      .filter((v) => Number.isFinite(v) && v > 0)

    if (valuesInMonths.length === 0) {
      continue
    }

    hasFiniteDuration = true
    const stepMin = Math.min(...valuesInMonths)
    const stepMax = Math.max(...valuesInMonths)
    minMonths += stepMin
    maxMonths += stepMax
  }

  if (!hasFiniteDuration) {
    return "Ongoing"
  }

  const roundedMin = Math.round(minMonths)
  const roundedMax = Math.round(maxMonths)
  const base = roundedMin === roundedMax ? `${roundedMin} months` : `${roundedMin}-${roundedMax} months`
  return hasOngoingDuration ? `${base} + ongoing` : base
}

function isDataScientistTrack(careerName: string, careerDomain?: string): boolean {
  const text = `${careerName} ${careerDomain ?? ""}`.toLowerCase()
  return text.includes("data scientist") || text.includes("data science")
}

function generateDataScientistRoadmap(profile: ReturnType<typeof normalizeProfile>): {
  steps: GeneratedStep[]
  pathwaySummary: { primaryPath: string; alternatePath: string }
} {
  const student10th = profile.currentStage === "school-10"

  const steps: GeneratedStep[] = [
    {
      title: student10th ? "Complete Class 10 With Strong Math Base" : "Build Math + Logic Foundation",
      description: student10th
        ? "Focus on mathematics and science basics. These are non-negotiable for data science later."
        : "Refresh arithmetic, algebra, statistics basics, and logical reasoning before coding-heavy stages.",
      duration: "3-6 months",
      whyThisStage: "Data science relies heavily on math and structured problem solving.",
      requiredSkills: ["Algebra", "Basic Statistics", "Logical Reasoning"],
      resourceTracks: {
        free: ["Khan Academy Math", "NCERT Math/Science", "NPTEL Foundation Lectures"],
        paid: ["Byju's Foundations", "Vedantu Targeted Board Prep"],
      },
      resources: ["Khan Academy Math", "NCERT Math/Science", "NPTEL Foundation Lectures", "Byju's Foundations", "Vedantu Targeted Board Prep"],
    },
    {
      title: "Intermediate (MPC) Or Equivalent Quant Track",
      description: "Choose MPC (Maths, Physics, Chemistry) where possible. If not, pick the most quantitative stream available and add extra math prep.",
      duration: "24 months",
      whyThisStage: "MPC provides the strongest path for B.Tech CSE and quantitative careers.",
      requiredSkills: ["Intermediate Mathematics", "Problem Solving", "Study Discipline"],
      decisionBreakpoint: {
        question: "Can you pursue MPC and maintain strong math performance?",
        passCriteria: ["Consistent math scores", "Comfort with algebra/calculus basics"],
        alternatePath: "If MPC is not feasible, continue with available stream + complete a parallel math bridge before degree stage.",
      },
      resourceTracks: {
        free: ["Telangana/AP Board Materials", "IIT-PAL YouTube", "Khan Academy Calculus"],
        paid: ["Narayana / Sri Chaitanya Modules", "Unacademy Intermediate Math"],
      },
      resources: ["Telangana/AP Board Materials", "IIT-PAL YouTube", "Khan Academy Calculus", "Narayana / Sri Chaitanya Modules", "Unacademy Intermediate Math"],
    },
    {
      title: "Degree Stage: Primary and Alternate Route",
      description:
        "Primary: B.Tech CSE/AI-DS (4 years). Alternate: B.Sc Statistics / BCA + strong Python/SQL portfolio.",
      duration: "36-48 months",
      whyThisStage: "Formal degree + portfolio improves interview conversion significantly in India.",
      requiredSkills: ["Python", "SQL", "Statistics", "Data Structures"],
      decisionBreakpoint: {
        question: "Is B.Tech CSE financially/academically feasible?",
        passCriteria: ["Eligible admission path", "Sustainable finances"],
        alternatePath: "Take B.Sc Stats/BCA route and target Data Analyst entry role first, then move to Data Scientist.",
      },
      resourceTracks: {
        free: ["freeCodeCamp Python", "Kaggle Micro-Courses", "NPTEL Python/ML", "PostgreSQL Tutorials"],
        paid: ["Coursera Data Science Specializations", "DataCamp Career Tracks"],
      },
      resources: ["freeCodeCamp Python", "Kaggle Micro-Courses", "NPTEL Python/ML", "PostgreSQL Tutorials", "Coursera Data Science Specializations", "DataCamp Career Tracks"],
    },
    {
      title: "Portfolio + Internship Conversion Stage",
      description:
        "Build 3-5 projects (EDA, dashboard, predictive model) and apply for analyst/intern roles with project-based resume.",
      duration: "6-12 months",
      whyThisStage: "Projects and internships are the proof that converts interviews.",
      requiredSkills: ["Pandas", "Data Visualization", "Model Evaluation", "Presentation Skills"],
      decisionBreakpoint: {
        question: "Are you getting interview calls after 50-100 applications?",
        passCriteria: ["Portfolio with measurable outcomes", "Resume + LinkedIn optimized"],
        alternatePath: "If no, pivot temporarily to BI/Data Analyst roles, gain 1-2 years experience, then move toward Data Scientist.",
      },
      resourceTracks: {
        free: ["Kaggle Notebooks", "Power BI Community", "GitHub Pages Portfolio"],
        paid: ["InterviewBit / Scalar Mock Interviews", "LeetCode Premium"],
      },
      resources: ["Kaggle Notebooks", "Power BI Community", "GitHub Pages Portfolio", "InterviewBit / Scalar Mock Interviews", "LeetCode Premium"],
    },
  ]

  return {
    steps,
    pathwaySummary: {
      primaryPath: "10th -> Intermediate MPC -> B.Tech CSE/AI-DS -> Internship -> Data Scientist",
      alternatePath: "10th -> Quant stream + math bridge -> B.Sc Stats/BCA -> Data Analyst -> Data Scientist",
    },
  }
}

function generateGenericRoadmap(careerName: string, profile: ReturnType<typeof normalizeProfile>): {
  steps: GeneratedStep[]
  pathwaySummary: { primaryPath: string; alternatePath: string }
} {
  const isWorking = profile.currentStage === "working"

  const steps: GeneratedStep[] = [
    {
      title: isWorking ? "Stability + Learning Foundation" : "Foundation Stage",
      description: isWorking
        ? "Protect current income while building daily learning consistency and core fundamentals for transition."
        : "Build the fundamental skills and study discipline required for this role.",
      duration: "3-6 months",
      whyThisStage: "Strong foundations reduce drop-off and improve long-term outcomes.",
      requiredSkills: ["Core fundamentals", "Learning discipline", "Communication"],
      resourceTracks: {
        free: ["YouTube role fundamentals", "Official documentation", "freeCodeCamp / NPTEL"],
        paid: ["Structured role-based bootcamps", "Mentor-led cohorts"],
      },
      resources: ["YouTube role fundamentals", "Official documentation", "freeCodeCamp / NPTEL", "Structured role-based bootcamps", "Mentor-led cohorts"],
    },
    {
      title: "Core Role Skills",
      description: `Build the core technical stack required for ${careerName} through guided projects.`,
      duration: "4-8 months",
      whyThisStage: "Employers evaluate role-specific competency first.",
      requiredSkills: ["Role-specific tools", "Practical project execution", "Problem solving"],
      decisionBreakpoint: {
        question: "Can you complete 2 end-to-end role-relevant projects?",
        passCriteria: ["Projects deployed/shared", "Can explain decisions clearly"],
        alternatePath: "If not, take an adjacent entry role first, then return to target role specialization.",
      },
      resourceTracks: {
        free: ["Project tutorials", "Open-source starter repos", "Community forums"],
        paid: ["Project review programs", "Capstone-based courses"],
      },
      resources: ["Project tutorials", "Open-source starter repos", "Community forums", "Project review programs", "Capstone-based courses"],
    },
    {
      title: "Portfolio + Interview Readiness",
      description: "Package work into a clear portfolio, prepare role-based interview answers, and start structured applications.",
      duration: "3-6 months",
      whyThisStage: "Portfolio quality and communication drive interview conversions.",
      requiredSkills: ["Portfolio presentation", "Interview storytelling", "Resume tailoring"],
      decisionBreakpoint: {
        question: "Are you getting calls after targeted applications?",
        passCriteria: ["At least 5 interview calls in 8 weeks", "Strong recruiter feedback"],
        alternatePath: "If not, broaden to adjacent job titles and gain 6-12 months experience before re-targeting.",
      },
      resourceTracks: {
        free: ["GitHub Portfolio", "LinkedIn optimization guides", "Peer mock interviews"],
        paid: ["Career coaching", "Mock interview platforms"],
      },
      resources: ["GitHub Portfolio", "LinkedIn optimization guides", "Peer mock interviews", "Career coaching", "Mock interview platforms"],
    },
  ]

  return {
    steps,
    pathwaySummary: {
      primaryPath: `Direct path toward ${careerName} with project-first progression`,
      alternatePath: "Adjacent entry role -> experience build -> transition to target role",
    },
  }
}

function validateRoadmapProfileInput(profile: unknown):
  | { ok: true }
  | { ok: false; error: string } {
  if (!profile || typeof profile !== "object") {
    return { ok: false, error: "Profile is required." }
  }

  const p = profile as Record<string, unknown>

  if (typeof p.dateOfBirth !== "string" || p.dateOfBirth.trim().length === 0) {
    return { ok: false, error: "Date of birth is required." }
  }

  const age = deriveAge(p.dateOfBirth)
  if (typeof age !== "number" || age < 13 || age > 100) {
    return { ok: false, error: "Date of birth must map to age between 13 and 100." }
  }

  if (typeof p.currentStage !== "string" || !VALID_STAGES.includes(p.currentStage as CurrentStage)) {
    return { ok: false, error: "Current stage is invalid." }
  }

  const stage = p.currentStage as CurrentStage

  if (typeof p.qualification !== "string") {
    return { ok: false, error: "Qualification is required." }
  }
  const qualification = p.qualification.trim()
  if (stage !== "school-10") {
    if (qualification.length < 2 || qualification.length > 120) {
      return { ok: false, error: "Education details must be between 2 and 120 characters." }
    }
  } else if (qualification.length > 120) {
    return { ok: false, error: "Education details cannot exceed 120 characters." }
  }

  if (typeof p.currentRole !== "string") {
    return { ok: false, error: "Current role is required." }
  }
  const currentRole = p.currentRole.trim()
  if (currentRole.length < 2 || currentRole.length > 120) {
    return { ok: false, error: "Current role must be between 2 and 120 characters." }
  }

  if (p.skills !== undefined) {
    if (!Array.isArray(p.skills)) {
      return { ok: false, error: "Skills must be an array of strings." }
    }
    if (p.skills.length > 20) {
      return { ok: false, error: "Skills cannot exceed 20 entries." }
    }
    for (const skill of p.skills) {
      if (typeof skill !== "string") {
        return { ok: false, error: "Each skill must be a string." }
      }
      const trimmed = skill.trim()
      if (trimmed.length === 0 || trimmed.length > 50) {
        return { ok: false, error: "Each skill must be between 1 and 50 characters." }
      }
    }
  }

  return { ok: true }
}

function extractFirstJsonObject(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch?.[1]) {
    const candidate = fenceMatch[1].trim()
    if (candidate.startsWith("{") && candidate.endsWith("}")) {
      return candidate
    }
  }

  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1)
  }

  return null
}

function repairLikelyJson(rawJson: string): string {
  let fixed = rawJson
    .replace(/\u0000/g, "")
    .replace(/,\s*([}\]])/g, "$1")

  const openBraces = (fixed.match(/{/g) || []).length
  const closeBraces = (fixed.match(/}/g) || []).length
  if (closeBraces < openBraces) {
    fixed += "}".repeat(openBraces - closeBraces)
  }

  const openBrackets = (fixed.match(/\[/g) || []).length
  const closeBrackets = (fixed.match(/\]/g) || []).length
  if (closeBrackets < openBrackets) {
    fixed += "]".repeat(openBrackets - closeBrackets)
  }

  return fixed
}

function parseRoadmapFromText(params: {
  text: string
  careerName: string
}): {
  normalized: {
    steps: GeneratedStep[]
    pathwaySummary: { primaryPath: string; alternatePath: string }
  } | null
  hadJsonCandidate: boolean
} {
  const jsonText = extractFirstJsonObject(params.text)
  if (!jsonText) {
    return { normalized: null, hadJsonCandidate: false }
  }

  try {
    const parsed = JSON.parse(jsonText)
    return {
      normalized: parseRoadmapResponsePayload({
        payload: parsed,
        careerName: params.careerName,
      }),
      hadJsonCandidate: true,
    }
  } catch {
    try {
      const repaired = repairLikelyJson(jsonText)
      const reparsed = JSON.parse(repaired)
      return {
        normalized: parseRoadmapResponsePayload({
          payload: reparsed,
          careerName: params.careerName,
        }),
        hadJsonCandidate: true,
      }
    } catch {
      return { normalized: null, hadJsonCandidate: true }
    }
  }
}

function sanitizeStringArray(value: unknown, maxItems = 8, maxLen = 80): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, maxItems)
    .map((v) => (v.length > maxLen ? v.slice(0, maxLen) : v))
}

function sanitizeGeneratedSteps(raw: unknown): GeneratedStep[] {
  if (!Array.isArray(raw)) return []

  const steps: GeneratedStep[] = []

  for (const item of raw.slice(0, 6)) {
    if (!item || typeof item !== "object") continue
    const obj = item as Record<string, unknown>

    const title = typeof obj.title === "string" ? obj.title.trim() : ""
    const description = typeof obj.description === "string" ? obj.description.trim() : ""
    const duration = typeof obj.duration === "string" ? obj.duration.trim() : ""
    if (!title || !description || !duration) continue

    const requiredSkills = sanitizeStringArray(obj.requiredSkills, 6, 50)

    let decisionBreakpoint: GeneratedStep["decisionBreakpoint"] | undefined
    if (obj.decisionBreakpoint && typeof obj.decisionBreakpoint === "object") {
      const d = obj.decisionBreakpoint as Record<string, unknown>
      const question = typeof d.question === "string" ? d.question.trim() : ""
      const alternatePath = typeof d.alternatePath === "string" ? d.alternatePath.trim() : ""
      const passCriteria = sanitizeStringArray(d.passCriteria, 5, 90)
      if (question && alternatePath && passCriteria.length > 0) {
        decisionBreakpoint = { question, alternatePath, passCriteria }
      }
    }

    let resourceTracks: RoadmapResourceTracks | undefined
    if (obj.resourceTracks && typeof obj.resourceTracks === "object") {
      const r = obj.resourceTracks as Record<string, unknown>
      const free = sanitizeStringArray(r.free, 6, 90)
      const paid = sanitizeStringArray(r.paid, 6, 90)
      resourceTracks = { free, paid }
    }

    const resources = [
      ...(resourceTracks?.free ?? []),
      ...(resourceTracks?.paid ?? []),
    ]

    steps.push({
      title,
      description,
      duration,
      resources,
      whyThisStage:
        typeof obj.whyThisStage === "string" && obj.whyThisStage.trim().length > 0
          ? obj.whyThisStage.trim()
          : undefined,
      requiredSkills,
      resourceTracks,
      decisionBreakpoint,
    })
  }

  return steps
}

function parseRoadmapResponsePayload(params: {
  payload: unknown
  careerName: string
}): {
  steps: GeneratedStep[]
  pathwaySummary: { primaryPath: string; alternatePath: string }
} | null {
  const parsed = params.payload as {
    pathwaySummary?: { primaryPath?: string; alternatePath?: string } | string
    steps?: unknown
  }

  const steps = sanitizeGeneratedSteps(parsed.steps)
  if (steps.length < 3) return null

  let primaryPath = `Direct path toward ${params.careerName}`
  let alternatePath = `Alternative route to ${params.careerName} through adjacent role progression`

  if (typeof parsed.pathwaySummary === "string" && parsed.pathwaySummary.trim()) {
    primaryPath = parsed.pathwaySummary.trim()
  } else if (parsed.pathwaySummary && typeof parsed.pathwaySummary === "object") {
    if (typeof parsed.pathwaySummary.primaryPath === "string" && parsed.pathwaySummary.primaryPath.trim()) {
      primaryPath = parsed.pathwaySummary.primaryPath.trim()
    }
    if (typeof parsed.pathwaySummary.alternatePath === "string" && parsed.pathwaySummary.alternatePath.trim()) {
      alternatePath = parsed.pathwaySummary.alternatePath.trim()
    }
  }

  return {
    steps,
    pathwaySummary: {
      primaryPath,
      alternatePath,
    },
  }
}

function isLikelyLegacyFallbackRoadmap(roadmap: {
  steps?: Array<{ title?: string }>
  pathwaySummary?: { primaryPath?: string; alternatePath?: string }
}): boolean {
  const stepTitles = Array.isArray(roadmap.steps)
    ? roadmap.steps.map((s) => (typeof s?.title === "string" ? s.title.toLowerCase() : ""))
    : []

  const primary = roadmap.pathwaySummary?.primaryPath?.toLowerCase() ?? ""
  const alternate = roadmap.pathwaySummary?.alternatePath?.toLowerCase() ?? ""

  const hasGenericTitles =
    stepTitles.includes("foundation stage") &&
    stepTitles.includes("core role skills") &&
    stepTitles.includes("portfolio + interview readiness")

  const hasGenericPathway =
    primary.includes("direct path toward") && alternate.includes("adjacent entry role")

  return hasGenericTitles || hasGenericPathway
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

async function generateRoadmapWithAI(params: {
  careerName: string
  careerDomain?: string
  profile: ReturnType<typeof normalizeProfile>
}): Promise<
  | {
      steps: GeneratedStep[]
      pathwaySummary: { primaryPath: string; alternatePath: string }
      provider: "groq" | "gemini" | "openrouter" | "bytez"
    }
  | null
> {
  const { careerName, careerDomain, profile } = params

  pruneRoadmapAiCache()
  const aiCacheKey = JSON.stringify({
    careerName,
    careerDomain: careerDomain ?? "",
    stage: profile.currentStage,
    age: profile.age ?? null,
    qualification: profile.qualification,
    currentRole: profile.currentRole,
    skills: profile.skills,
  })
  const cached = roadmapAiCache.get(aiCacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  let careerSignals = ""
  try {
    const careers = await getCareersList()
    const match = careers.find(
      (c) => c.name.toLowerCase() === careerName.toLowerCase()
    )
    if (match) {
      const skills = Array.isArray(match.skills) ? match.skills.slice(0, 10).join(", ") : ""
      careerSignals = [
        `Career Description: ${match.description}`,
        `Typical Skills: ${skills}`,
        `Difficulty: ${match.difficulty}`,
      ].join("\n")
    }
  } catch {
    // Ignore career data enrichment failures and continue with provided career info.
  }

  const systemPrompt = `Return ONLY valid JSON (no markdown) with this shape:
{
  "pathwaySummary": { "primaryPath": "...", "alternatePath": "..." },
  "steps": [
    {
      "title": "...",
      "description": "...",
      "duration": "...",
      "whyThisStage": "...",
      "requiredSkills": ["..."],
      "resourceTracks": { "free": ["..."], "paid": ["..."] },
      "decisionBreakpoint": {
        "question": "...",
        "passCriteria": ["..."],
        "alternatePath": "..."
      }
    }
  ]
}
Rules:
- 4 steps for students, 3 steps for working professionals.
- At least 2 steps must include decisionBreakpoint.
- India-focused, practical, role-specific.`

  const userPrompt = `Generate roadmap.
Career: ${careerName}
Domain: ${careerDomain ?? "Unknown"}
Age: ${profile.age ?? "Unknown"}
Stage: ${profile.currentStage}
Education: ${profile.qualification || "Not specified"}
Current role: ${profile.currentRole || "Not specified"}
Skills: ${profile.skills.join(", ") || "None"}
${careerSignals ? `Career hints: ${careerSignals}` : ""}`

  const compactSystemPrompt = `${systemPrompt}
Additional constraints:
- Keep each description/whyThisStage/decision text concise (<= 110 chars each).
- Keep requiredSkills/passCriteria max 4 items.
- Keep resourceTracks.free and resourceTracks.paid max 3 items each.`

  const aiDeadlineAt = Date.now() + ROADMAP_TOTAL_AI_BUDGET_MS
  const getRemainingBudgetMs = () => aiDeadlineAt - Date.now()
  const isBudgetExhausted = () => getRemainingBudgetMs() <= 0
  const getAttemptTimeoutMs = (preferredMs: number) => {
    const remaining = getRemainingBudgetMs() - 250
    if (remaining <= 0) return 0
    return Math.min(preferredMs, Math.max(MIN_PROVIDER_ATTEMPT_MS, remaining))
  }

  let providerCalls = 0
  let geminiBudgetExhausted = false
  const geminiExhaustedKeys = new Set<string>()
  const geminiModelsWithFormatIssues = new Set<string>()

  const shouldSkipGeminiKey = (apiKey: string): boolean => {
    return geminiExhaustedKeys.has(apiKey)
  }

  const markGeminiKeyExhausted = (apiKey: string) => {
    geminiExhaustedKeys.add(apiKey)
  }

  const shouldSkipGeminiModel = (model: string): boolean => {
    return geminiModelsWithFormatIssues.has(model)
  }

  const markGeminiModelFormatIssue = (model: string) => {
    geminiModelsWithFormatIssues.add(model)
  }

  if (GROQ_API_KEY && !isBudgetExhausted() && !isProviderCoolingDown("groq-roadmap")) {
    for (const groqModel of GROQ_MODEL_CANDIDATES.slice(0, MAX_GROQ_MODELS_PER_REQUEST)) {
      if (isBudgetExhausted()) break

      if (!tryAcquireProviderSlot("groq-roadmap", GROQ_RATE_LIMIT_PER_MINUTE)) {
        console.warn("Groq roadmap skipped due to local RPM guard")
        break
      }

      const groqAttemptTimeoutMs = getAttemptTimeoutMs(GROQ_ROADMAP_TIMEOUT_MS)
      if (groqAttemptTimeoutMs < MIN_PROVIDER_ATTEMPT_MS) break

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), groqAttemptTimeoutMs)

      let response: Response
      try {
        response = await runInProviderQueue("groq-roadmap", () =>
          fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: groqModel,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.35,
              max_completion_tokens: 900,
              response_format: { type: "json_object" },
            }),
            signal: controller.signal,
          })
        )
      } finally {
        clearTimeout(timeout)
      }

      if (!response.ok) {
        noteProviderFailure({
          providerId: "groq-roadmap",
          statusCode: response.status,
          cooldownMs: GROQ_COOLDOWN_MS,
          failureThreshold: GROQ_COOLDOWN_FAILURE_THRESHOLD,
        })
        console.error(`Groq roadmap non-OK (${groqModel}):`, await response.text())
        continue
      }

      noteProviderSuccess("groq-roadmap")

      const data = await response.json()
      const text = data?.choices?.[0]?.message?.content
      if (typeof text !== "string" || !text.trim()) continue

      const parsedGroq = parseRoadmapFromText({ text, careerName })
      if (parsedGroq.normalized) {
        const value = { ...parsedGroq.normalized, provider: "groq" as const }
        roadmapAiCache.set(aiCacheKey, {
          value,
          expiresAt: Date.now() + ROADMAP_AI_CACHE_TTL_MS,
        })
        return value
      }
    }
  }

  for (const model of ROADMAP_MODEL_CANDIDATES) {
    if (isBudgetExhausted()) {
      break
    }

    if (shouldSkipGeminiModel(model)) {
      continue
    }

    for (const apiKey of getRotatedRoadmapGeminiKeys()) {
      if (isBudgetExhausted()) {
        geminiBudgetExhausted = true
        break
      }

      if (shouldSkipGeminiKey(apiKey)) {
        continue
      }

      if (providerCalls >= MAX_ROADMAP_PROVIDER_CALLS) {
        geminiBudgetExhausted = true
        break
      }
      providerCalls++

      const geminiAttemptTimeoutMs = getAttemptTimeoutMs(ROADMAP_PROVIDER_TIMEOUT_MS)
      if (geminiAttemptTimeoutMs < MIN_PROVIDER_ATTEMPT_MS) {
        geminiBudgetExhausted = true
        break
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), geminiAttemptTimeoutMs)
      let resp: Response
      try {
        resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: "user", parts: [{ text: userPrompt }] }],
              generationConfig: {
                temperature: 0.35,
                maxOutputTokens: 900,
                responseMimeType: "application/json",
              },
            }),
            signal: controller.signal,
          }
        )
      } catch {
        clearTimeout(timeout)
        continue
      }
      clearTimeout(timeout)

      if (!resp.ok) {
        let errText = ""
        try {
          errText = await resp.text()
          console.error(`Gemini roadmap non-OK (${resp.status}) model=${model}:`, errText.slice(0, 220))
        } catch {
          console.error(`Gemini roadmap non-OK (${resp.status}) model=${model}`)
        }

        const lowered = errText.toLowerCase()
        const isQuotaError =
          resp.status === 429 ||
          lowered.includes("quota") ||
          lowered.includes("rate limit")

        if (isQuotaError) {
          markGeminiKeyExhausted(apiKey)
        }

        const isFormatError =
          resp.status === 400 &&
          (lowered.includes("invalid json") ||
            lowered.includes("response schema") ||
            lowered.includes("invalid argument"))

        if (isFormatError) {
          markGeminiModelFormatIssue(model)
        }

        const isUnavailable =
          resp.status === 503 ||
          lowered.includes("unavailable") ||
          lowered.includes("high demand")

        if (isUnavailable) {
          // Avoid retrying the same overloaded model with every key in this request cycle.
          markGeminiModelFormatIssue(model)
          break
        }

        continue
      }

      const data = await resp.json()
      const finishReason = data?.candidates?.[0]?.finishReason
      const text = (data?.candidates?.[0]?.content?.parts ?? [])
        .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
        .join("\n")
        .trim()

      const parsedPrimary = parseRoadmapFromText({ text, careerName })
      if (parsedPrimary.normalized) {
        const value = { ...parsedPrimary.normalized, provider: "gemini" as const }
        roadmapAiCache.set(aiCacheKey, {
          value,
          expiresAt: Date.now() + ROADMAP_AI_CACHE_TTL_MS,
        })
        return value
      }

      if (!parsedPrimary.hadJsonCandidate) {
        console.error(`Roadmap AI parse miss for model ${model}: no JSON object in response`)
      }

      if (finishReason === "MAX_TOKENS") {
        const geminiRetryTimeoutMs = getAttemptTimeoutMs(ROADMAP_PROVIDER_TIMEOUT_MS)
        if (geminiRetryTimeoutMs < MIN_PROVIDER_ATTEMPT_MS) {
          markGeminiModelFormatIssue(model)
          break
        }

        const retryController = new AbortController()
        const retryTimeout = setTimeout(() => retryController.abort(), geminiRetryTimeoutMs)
        try {
          const retryResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: compactSystemPrompt }] },
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 1000,
                  responseMimeType: "application/json",
                },
              }),
              signal: retryController.signal,
            }
          )

          if (retryResp.ok) {
            const retryData = await retryResp.json()
            const retryText = (retryData?.candidates?.[0]?.content?.parts ?? [])
              .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
              .join("\n")
              .trim()

            const parsedRetry = parseRoadmapFromText({ text: retryText, careerName })
            if (parsedRetry.normalized) {
              const value = { ...parsedRetry.normalized, provider: "gemini" as const }
              roadmapAiCache.set(aiCacheKey, {
                value,
                expiresAt: Date.now() + ROADMAP_AI_CACHE_TTL_MS,
              })
              return value
            }
          }
        } catch {
          // Fall through to next provider/model.
        } finally {
          clearTimeout(retryTimeout)
        }
      }

      // Skip repeating the same model across other keys when output format is unstable.
      markGeminiModelFormatIssue(model)
      break
    }

    if (geminiBudgetExhausted) {
      break
    }
  }

    if (OPENROUTER_API_KEY && !isBudgetExhausted()) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        }
        if (OPENROUTER_REFERER) headers["HTTP-Referer"] = OPENROUTER_REFERER
        if (OPENROUTER_TITLE) headers["X-OpenRouter-Title"] = OPENROUTER_TITLE

        for (const openRouterModel of OPENROUTER_FREE_MODELS) {
          if (isBudgetExhausted()) {
            break
          }

          const openRouterAttemptTimeoutMs = getAttemptTimeoutMs(OPENROUTER_ROADMAP_TIMEOUT_MS)
          if (openRouterAttemptTimeoutMs < MIN_PROVIDER_ATTEMPT_MS) {
            break
          }

          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), openRouterAttemptTimeoutMs)
          let response: Response
          try {
            const defaultBody = {
              model: openRouterModel,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.35,
              max_tokens: 900,
              response_format: { type: "json_object" as const },
            }

            response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers,
              body: JSON.stringify(defaultBody),
              signal: controller.signal,
            })

            if (!response.ok && response.status === 400) {
              const firstErrorText = await response.text()
              const developerInstructionUnsupported = firstErrorText
                .toLowerCase()
                .includes("developer instruction is not enabled")

              if (developerInstructionUnsupported) {
                response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    model: openRouterModel,
                    messages: [
                      {
                        role: "user",
                        content: `${systemPrompt}\n\n${userPrompt}`,
                      },
                    ],
                    temperature: 0.35,
                    max_tokens: 900,
                    response_format: { type: "json_object" },
                  }),
                  signal: controller.signal,
                })
              } else {
                console.error(`OpenRouter roadmap non-OK (${openRouterModel}):`, firstErrorText)
                continue
              }
            }
          } finally {
            clearTimeout(timeout)
          }

          if (response.ok) {
            const data = await response.json()
            const text = data?.choices?.[0]?.message?.content
            if (typeof text === "string" && text.trim().length > 0) {
              const parsedOpenRouter = parseRoadmapFromText({ text, careerName })
              if (parsedOpenRouter.normalized) {
                const value = { ...parsedOpenRouter.normalized, provider: "openrouter" as const }
                roadmapAiCache.set(aiCacheKey, {
                  value,
                  expiresAt: Date.now() + ROADMAP_AI_CACHE_TTL_MS,
                })
                return value
              }

              if (parsedOpenRouter.hadJsonCandidate) {
                console.error(`OpenRouter roadmap parse miss (${openRouterModel}): invalid JSON payload`)
              }
            }
          } else {
            console.error(`OpenRouter roadmap non-OK (${openRouterModel}):`, await response.text())
          }
        }
      } catch (error) {
        console.error("OpenRouter roadmap fallback failed:", error)
      }
    }

  if (BYTEZ_API_KEY && !isBudgetExhausted()) {
    try {
      const { default: Bytez } = await import("bytez.js")
      const sdk = new Bytez(BYTEZ_API_KEY)
      const model = sdk.model(BYTEZ_MODEL)

      const bytezAttemptTimeoutMs = getAttemptTimeoutMs(BYTEZ_ROADMAP_TIMEOUT_MS)
      if (bytezAttemptTimeoutMs < MIN_PROVIDER_ATTEMPT_MS) {
        return null
      }

      const bytezResult = await Promise.race([
        model.run([
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ]),
        new Promise<{ error: string; output: null }>((resolve) =>
          setTimeout(() => resolve({ error: "timeout", output: null }), bytezAttemptTimeoutMs)
        ),
      ])

      const { error, output } = bytezResult as { error?: string; output?: unknown }

      if (!error) {
        const text = extractTextFromBytezOutput(output)

        const parsedBytez = parseRoadmapFromText({ text, careerName })
        if (parsedBytez.normalized) {
          const value = { ...parsedBytez.normalized, provider: "bytez" as const }
          roadmapAiCache.set(aiCacheKey, {
            value,
            expiresAt: Date.now() + ROADMAP_AI_CACHE_TTL_MS,
          })
          return value
        }
      } else {
        console.error("Bytez roadmap error:", error)
      }
    } catch (error) {
      console.error("Bytez roadmap fallback failed:", error)
    }
  }

  return null
}

export async function POST(request: Request) {
  try {
    const { careerId, careerName, careerDomain, profile } = await request.json()

    if (!careerId || !careerName) {
      return NextResponse.json(
        { error: "Career ID and name are required" },
        { status: 400 }
      )
    }

    const profileValidation = validateRoadmapProfileInput(profile)
    if (!profileValidation.ok) {
      return NextResponse.json(
        { error: profileValidation.error },
        { status: 400 }
      )
    }

    const normalizedProfile = normalizeProfile(profile)
    const profileKey = buildProfileKey(careerId, normalizedProfile)

    // Return existing personalized roadmap if same profile already generated.
    const existingRoadmap = store.roadmaps.find(
      (r) => r.careerId === careerId && r.profileKey === profileKey
    )
    const shouldRegenerateFallback =
      !!existingRoadmap &&
      ((existingRoadmap as any).generationSource === "fallback" ||
        ((existingRoadmap as any).generationSource == null && isLikelyLegacyFallbackRoadmap(existingRoadmap as any)))

    if (existingRoadmap && !shouldRegenerateFallback) {
      const existingSource = (existingRoadmap as { generationSource?: string }).generationSource ?? "unknown"
      console.log(`Roadmap source: ${existingSource} (cache/store hit) careerId=${careerId}`)
      return NextResponse.json(
        { roadmap: existingRoadmap },
        { headers: { "x-roadmap-source": existingSource } }
      )
    }

    const aiGenerated = await generateRoadmapWithAI({
      careerName,
      careerDomain,
      profile: normalizedProfile,
    })

    const generated =
      aiGenerated ??
      (isDataScientistTrack(careerName, careerDomain)
        ? generateDataScientistRoadmap(normalizedProfile)
        : generateGenericRoadmap(careerName, normalizedProfile))

    const generationSource: "groq" | "gemini" | "openrouter" | "bytez" | "fallback" = aiGenerated
      ? aiGenerated.provider
      : "fallback"

    const steps = generated.steps
    const totalDuration = sumDurationRange(steps)

    const roadmapId = existingRoadmap?.id ?? generateId()
    const roadmap = {
      id: roadmapId,
      careerId,
      careerName,
      steps,
      totalDuration,
      profileKey,
      generationSource,
      profileSummary: {
        age: normalizedProfile.age,
        currentStage: normalizedProfile.currentStage,
        qualification: normalizedProfile.qualification,
        currentRole: normalizedProfile.currentRole,
      },
      pathwaySummary: generated.pathwaySummary,
      createdAt: new Date(),
    }

    console.log(`Roadmap source: ${generationSource} (generated) careerId=${careerId}`)

    if (existingRoadmap) {
      Object.assign(existingRoadmap, roadmap)
    } else {
      store.roadmaps.push(roadmap)
    }

    return NextResponse.json(
      { roadmap },
      { headers: { "x-roadmap-source": generationSource } }
    )
  } catch (error) {
    console.error("Roadmap error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roadmapId = searchParams.get("roadmapId")
    const roadmapIdsRaw = searchParams.get("roadmapIds")
    const careerId = searchParams.get("careerId")
    const profileKey = searchParams.get("profileKey")

    if (roadmapId) {
      const roadmap = store.roadmaps.find((r) => r.id === roadmapId)
      return NextResponse.json({ roadmap: roadmap || null })
    }

    if (roadmapIdsRaw) {
      const ids = roadmapIdsRaw
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
      const idSet = new Set(ids)
      const roadmaps = store.roadmaps.filter((r) => idSet.has(r.id))
      return NextResponse.json({ roadmaps })
    }

    if (careerId) {
      const roadmap = profileKey
        ? store.roadmaps.find((r) => r.careerId === careerId && r.profileKey === profileKey)
        : store.roadmaps.find((r) => r.careerId === careerId)
      return NextResponse.json({ roadmap: roadmap || null })
    }

    return NextResponse.json({ roadmaps: store.roadmaps })
  } catch (error) {
    console.error("Get roadmaps error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
