import { NextRequest, NextResponse } from "next/server"
import { verifyToken, getTokenFromRequest } from "@/lib/jwt"
import { store } from "@/lib/store"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const index = store.careers.findIndex((c) => c.id === id)
    const success = index >= 0

    if (success) {
      store.careers.splice(index, 1)
    }

    if (!success) {
      return NextResponse.json(
        { error: "Career not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Failed to delete career" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()

    const career = store.careers.find((c) => c.id === id)

    if (!career) {
      return NextResponse.json(
        { error: "Career not found" },
        { status: 404 }
      )
    }

    if (typeof body?.name === "string") career.name = body.name
    if (typeof body?.title === "string") career.name = body.title
    if (typeof body?.description === "string") career.description = body.description
    if (typeof body?.domain === "string") career.domain = body.domain
    if (Array.isArray(body?.skills)) career.skills = body.skills
    if (body?.salary && typeof body.salary === "object") career.salary = body.salary
    if (body?.salaryRange && typeof body.salaryRange === "object") career.salary = body.salaryRange
    if (typeof body?.difficulty === "string") career.difficulty = body.difficulty
    if (typeof body?.growth === "string") career.growth = body.growth
    if (typeof body?.scope === "string") career.scope = body.scope

    return NextResponse.json(career)
  } catch {
    return NextResponse.json(
      { error: "Failed to update career" },
      { status: 500 }
    )
  }
}
