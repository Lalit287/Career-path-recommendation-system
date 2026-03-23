import { NextRequest, NextResponse } from "next/server"
import { verifyToken, getTokenFromRequest } from "@/lib/jwt"
import { store } from "@/lib/store"

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, domain, description, skills, salaryRange, demandLevel, workEnvironment } = body

    if (!title || !domain || !description) {
      return NextResponse.json(
        { error: "Title, domain, and description are required" },
        { status: 400 }
      )
    }

    const career = store.addCareer({
      title,
      domain,
      description,
      skills: skills || [],
      salaryRange: salaryRange || { min: 0, max: 0 },
      demandLevel: demandLevel || "Medium",
      workEnvironment: workEnvironment || "Hybrid",
    })

    return NextResponse.json(career, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Failed to create career" },
      { status: 500 }
    )
  }
}
