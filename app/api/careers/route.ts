import { NextResponse } from "next/server"
import { store, generateId } from "@/lib/store"
import { getAuthCookie, verifyToken } from "@/lib/jwt"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/models/User"
import {
  getCareersList,
  invalidateCareersCache,
  isUsingMongoJobProfiles,
  apiCareerBodyToJobProfileDoc,
  jobProfileToApiCareer,
} from "@/lib/careers-data"
import { JobProfile } from "@/models/JobProfile"

const DOMAIN_ALIASES: Record<string, string[]> = {
  "artificial intelligence": ["Artificial Intelligence", "Machine Learning & AI"],
  "web development": ["Web Development", "Software Development"],
  "data science": ["Data Science", "Data Science & Analytics"],
  "cloud computing": ["Cloud Computing", "Cloud & DevOps"],
  "cybersecurity": ["Cybersecurity"],
  design: ["Design", "UI/UX & Product Design"],
}

function matchesDomainFilter(careerDomain: string, rawDomainFilter: string): boolean {
  const career = careerDomain.toLowerCase().trim()
  const filter = rawDomainFilter.toLowerCase().trim()

  const aliases = DOMAIN_ALIASES[filter] ?? [rawDomainFilter]
  const normalizedAliases = aliases.map((a) => a.toLowerCase().trim())

  if (normalizedAliases.some((a) => a === career)) return true

  // Fuzzy fallback for near-matches (e.g. "Data Science" vs "Data Science & Analytics")
  return normalizedAliases.some((a) => career.includes(a) || a.includes(career))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function tokenMatchesInText(text: string, token: string): boolean {
  if (token.length <= 2) {
    const termPattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(token)}([^a-z0-9]|$)`, "i")
    return termPattern.test(text)
  }
  return text.includes(token)
}

function scoreCareerForSearch(
  career: {
    name: string
    description: string
    domain: string
    scope: string
    growth: string
    difficulty: string
    skills: string[]
  },
  normalizedSearch: string,
  tokens: string[]
): number {
  const name = career.name.toLowerCase()
  const description = career.description.toLowerCase()
  const domain = career.domain.toLowerCase()
  const scope = career.scope.toLowerCase()
  const growth = career.growth.toLowerCase()
  const difficulty = career.difficulty.toLowerCase()
  const skills = career.skills.map((s) => s.toLowerCase())

  let score = 0

  if (name === normalizedSearch) score += 260
  else if (name.startsWith(normalizedSearch)) score += 180
  else if (name.includes(normalizedSearch)) score += 120

  if (domain.includes(normalizedSearch)) score += 80
  if (skills.some((s) => s.includes(normalizedSearch))) score += 90
  if (description.includes(normalizedSearch)) score += 40
  if (scope.includes(normalizedSearch)) score += 25
  if (growth.includes(normalizedSearch)) score += 10
  if (difficulty.includes(normalizedSearch)) score += 10

  for (const token of tokens) {
    if (tokenMatchesInText(name, token)) score += 30
    else if (name.includes(token)) score += 12

    if (skills.some((s) => tokenMatchesInText(s, token))) score += 16
    else if (skills.some((s) => s.includes(token))) score += 8

    if (tokenMatchesInText(domain, token)) score += 12
    else if (domain.includes(token)) score += 6

    if (tokenMatchesInText(description, token)) score += 6
    else if (description.includes(token)) score += 3

    if (tokenMatchesInText(scope, token)) score += 4
  }

  return score
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get("domain")
    const difficulty = searchParams.get("difficulty")
    const search = searchParams.get("search")

    let careers = await getCareersList()

    if (domain && domain !== "all") {
      careers = careers.filter((c) => matchesDomainFilter(c.domain, domain))
    }

    if (difficulty && difficulty !== "all") {
      careers = careers.filter((c) => c.difficulty === difficulty)
    }

    if (search) {
      const normalizedSearch = search.trim().toLowerCase()
      if (normalizedSearch) {
        const tokens = normalizedSearch.split(/\s+/).filter(Boolean)

        const ranked = careers
          .map((c) => {
            const haystack = [
              c.name,
              c.description,
              c.domain,
              c.scope,
              c.growth,
              c.difficulty,
              ...c.skills,
            ]
              .join(" ")
              .toLowerCase()

            const matches = tokens.every((token) => tokenMatchesInText(haystack, token))
            if (!matches) return null

            return {
              career: c,
              score: scoreCareerForSearch(c, normalizedSearch, tokens),
            }
          })
          .filter((item): item is { career: (typeof careers)[number]; score: number } => item !== null)
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score
            return a.career.name.localeCompare(b.career.name)
          })

        careers = ranked.map((item) => item.career)
      }
    }

    return NextResponse.json({ careers })
  } catch (error) {
    console.error("Get careers error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const token = await getAuthCookie()

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      )
    }

    await connectToDatabase()
    const user = await User.findById(decoded.userId)

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const data = await request.json()
    const useMongo = await isUsingMongoJobProfiles()

    if (useMongo) {
      const doc = apiCareerBodyToJobProfileDoc({
        name: data.name,
        description: data.description,
        skills: data.skills,
        salary: data.salary,
        difficulty: data.difficulty,
        scope: data.scope,
        domain: data.domain,
        growth: data.growth,
      })
      const created = await JobProfile.create(doc)
      invalidateCareersCache()
      const career = jobProfileToApiCareer({
        jobId: created.jobId,
        title: created.title,
        domain: created.domain,
        description: created.description,
        skillsRequired: created.skillsRequired,
        salaryRange: created.salaryRange,
        difficulty: created.difficulty,
        growthLevel: created.growthLevel,
        futureScope: created.futureScope,
        createdAt: created.createdAt,
      })
      return NextResponse.json({ career })
    }

    const newCareer = {
      id: generateId(),
      name: data.name,
      description: data.description,
      skills: data.skills || [],
      salary: data.salary || { min: 0, max: 0, currency: "USD" },
      difficulty: data.difficulty || "Intermediate",
      scope: data.scope || "",
      domain: data.domain || "",
      growth: data.growth || "Medium",
      createdAt: new Date(),
    }

    store.careers.push(newCareer)

    return NextResponse.json({ career: newCareer })
  } catch (error) {
    console.error("Create career error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
