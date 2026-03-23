import { NextResponse } from "next/server"
import { store, generateId } from "@/lib/store"
import { getAuthCookie, verifyToken } from "@/lib/jwt"
import {
  getCareersList,
  invalidateCareersCache,
  isUsingMongoJobProfiles,
  apiCareerBodyToJobProfileDoc,
  jobProfileToApiCareer,
} from "@/lib/careers-data"
import { JobProfile } from "@/models/JobProfile"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get("domain")
    const difficulty = searchParams.get("difficulty")
    const search = searchParams.get("search")

    let careers = await getCareersList()

    if (domain && domain !== "all") {
      careers = careers.filter((c) => c.domain.toLowerCase() === domain.toLowerCase())
    }

    if (difficulty && difficulty !== "all") {
      careers = careers.filter((c) => c.difficulty === difficulty)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      careers = careers.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.description.toLowerCase().includes(searchLower) ||
          c.skills.some((s) => s.toLowerCase().includes(searchLower))
      )
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

    const user = store.users.find((u) => u.id === decoded.userId)

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
