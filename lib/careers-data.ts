import type { StoredCareer } from "@/lib/store"
import { store, generateId } from "@/lib/store"
import { connectToDatabase } from "@/lib/mongodb"
import { JobProfile } from "@/models/JobProfile"

/** Shape returned by `/api/careers` — matches what the UI already expects */
export type ApiCareer = StoredCareer

function normalizeDifficulty(raw: string): string {
  const s = raw.trim()
  const lower = s.toLowerCase()
  const allowed = ["Beginner", "Intermediate", "Advanced", "Expert"]
  if (allowed.includes(s)) return s

  if (lower.includes("c-suite") || /^executive$/i.test(s)) return "Expert"
  if (
    lower.includes("director") ||
    lower.includes("distinguished") ||
    lower.includes("principal") ||
    lower === "expert"
  )
    return "Expert"

  if (
    lower.includes("senior") ||
    lower.includes("staff") ||
    (lower.includes("lead") && !lower.includes("entry"))
  )
    return "Advanced"

  if (lower === "entry-intermediate" || lower.includes("intermediate")) return "Intermediate"
  if (lower === "entry" || lower.includes("beginner")) return "Beginner"

  return "Intermediate"
}

function normalizeGrowth(raw: string): string {
  const s = raw.trim()
  if (/moderate/i.test(s)) return "Medium"
  const allowed = ["Low", "Medium", "High", "Very High"]
  if (allowed.includes(s)) return s
  return "Medium"
}

export function jobProfileToApiCareer(doc: {
  jobId: string
  title: string
  domain: string
  description: string
  skillsRequired?: string[]
  salaryRange: { min: number; max: number; currency: string }
  difficulty: string
  growthLevel: string
  futureScope: string
  createdAt?: Date
}): ApiCareer {
  return {
    id: doc.jobId,
    name: doc.title,
    description: doc.description,
    skills: doc.skillsRequired ?? [],
    salary: {
      min: doc.salaryRange.min,
      max: doc.salaryRange.max,
      currency: doc.salaryRange.currency,
    },
    difficulty: normalizeDifficulty(doc.difficulty),
    scope: doc.futureScope,
    domain: doc.domain,
    growth: normalizeGrowth(doc.growthLevel),
    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
  }
}

let mongoCareersCache: { careers: ApiCareer[]; at: number } | null = null
const CACHE_MS = 30_000

async function fetchJobProfilesFromMongo(): Promise<ApiCareer[] | null> {
  const conn = await connectToDatabase()
  if (!conn) return null

  try {
    const docs = await JobProfile.find({}).sort({ domain: 1, title: 1 }).lean()
    if (docs.length === 0) return null
    return docs.map((d) =>
      jobProfileToApiCareer({
        jobId: d.jobId,
        title: d.title,
        domain: d.domain,
        description: d.description,
        skillsRequired: d.skillsRequired,
        salaryRange: d.salaryRange,
        difficulty: d.difficulty,
        growthLevel: d.growthLevel,
        futureScope: d.futureScope,
        createdAt: d.createdAt,
      })
    )
  } catch (e) {
    console.error("JobProfile fetch failed:", e)
    return null
  }
}

/**
 * Primary career list for APIs: use MongoDB `job_profiles` when available and non-empty,
 * otherwise in-memory `store.careers` (demo / no DB).
 */
export async function getCareersList(options?: { bypassCache?: boolean }): Promise<ApiCareer[]> {
  const bypass = options?.bypassCache ?? false
  if (!bypass && mongoCareersCache && Date.now() - mongoCareersCache.at < CACHE_MS) {
    return mongoCareersCache.careers
  }

  const fromMongo = await fetchJobProfilesFromMongo()
  if (fromMongo && fromMongo.length > 0) {
    mongoCareersCache = { careers: fromMongo, at: Date.now() }
    return fromMongo
  }

  mongoCareersCache = null
  return [...store.careers]
}

export function invalidateCareersCache() {
  mongoCareersCache = null
}

export async function getCareerById(id: string): Promise<ApiCareer | null> {
  const list = await getCareersList()
  const fromList = list.find((c) => c.id === id)
  if (fromList) return fromList

  const conn = await connectToDatabase()
  if (!conn) return null

  try {
    const doc = await JobProfile.findOne({ jobId: id }).lean()
    if (!doc) return null
    return jobProfileToApiCareer({
      jobId: doc.jobId,
      title: doc.title,
      domain: doc.domain,
      description: doc.description,
      skillsRequired: doc.skillsRequired,
      salaryRange: doc.salaryRange,
      difficulty: doc.difficulty,
      growthLevel: doc.growthLevel,
      futureScope: doc.futureScope,
      createdAt: doc.createdAt,
    })
  } catch (e) {
    console.error("getCareerById:", e)
    return null
  }
}

export async function isUsingMongoJobProfiles(): Promise<boolean> {
  const conn = await connectToDatabase()
  if (!conn) return false
  try {
    const count = await JobProfile.countDocuments()
    return count > 0
  } catch {
    return false
  }
}

/** Map admin / API career body to a new JobProfile document */
/** Partial updates from admin PUT (same shape as StoredCareer / API) */
export function apiPartialToJobProfileSet(
  updates: Record<string, unknown>
): Record<string, unknown> {
  const $set: Record<string, unknown> = {}
  if (updates.name !== undefined) $set.title = updates.name
  if (updates.description !== undefined) $set.description = updates.description
  if (updates.domain !== undefined) $set.domain = updates.domain
  if (updates.skills !== undefined) $set.skillsRequired = updates.skills
  if (updates.salary !== undefined && typeof updates.salary === "object" && updates.salary !== null) {
    $set.salaryRange = updates.salary
  }
  if (updates.difficulty !== undefined) $set.difficulty = updates.difficulty
  if (updates.growth !== undefined) $set.growthLevel = updates.growth
  if (updates.scope !== undefined) $set.futureScope = updates.scope
  return $set
}

export function apiCareerBodyToJobProfileDoc(data: {
  name: string
  description: string
  skills?: string[]
  salary?: { min: number; max: number; currency?: string }
  difficulty?: string
  scope?: string
  domain?: string
  growth?: string
}) {
  const salary = data.salary ?? { min: 0, max: 0, currency: "INR" }
  return {
    jobId: generateId(),
    onetSocCode: null as string | null,
    title: data.name,
    domain: data.domain ?? "",
    description: data.description,
    rolesResponsibilities: [] as string[],
    skillsRequired: data.skills ?? [],
    educationalQualification: {
      minimum: "Not specified",
      preferred: [] as string[],
      alternative: [] as string[],
    },
    experienceLevel: "Not specified",
    difficulty: data.difficulty ?? "Intermediate",
    toolsTechnologies: [] as string[],
    salaryRange: {
      min: salary.min,
      max: salary.max,
      currency: salary.currency ?? "INR",
    },
    growthLevel: data.growth ?? "Medium",
    futureScope: data.scope ?? "",
    sourceLastUpdated: new Date().toISOString().slice(0, 7),
  }
}
