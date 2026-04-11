import { NextRequest, NextResponse } from "next/server"
import { verifyToken, getTokenFromRequest } from "@/lib/jwt"
import { generateId, store } from "@/lib/store"

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
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const name = typeof body?.name === "string" ? body.name : body?.title
    const description = typeof body?.description === "string" ? body.description : ""
    const domain = typeof body?.domain === "string" ? body.domain : ""
    const skills = Array.isArray(body?.skills) ? body.skills : []
    const salary = body?.salary || body?.salaryRange || { min: 0, max: 0, currency: "INR" }
    const difficulty = typeof body?.difficulty === "string" ? body.difficulty : "Intermediate"
    const growth = typeof body?.growth === "string" ? body.growth : (typeof body?.demandLevel === "string" ? body.demandLevel : "Medium")
    const scope = typeof body?.scope === "string" ? body.scope : (typeof body?.workEnvironment === "string" ? body.workEnvironment : "")

    if (!name || !domain || !description) {
      return NextResponse.json(
        { error: "Title, domain, and description are required" },
        { status: 400 }
      )
    }

    const career = {
      id: generateId(),
      name,
      domain,
      description,
      skills,
      salary,
      difficulty,
      growth,
      scope,
      createdAt: new Date(),
    }

    store.careers.push(career)

    return NextResponse.json(career, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Failed to create career" },
      { status: 500 }
    )
  }
}
