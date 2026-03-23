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
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const { id } = await params
    const success = store.deleteCareer(id)

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
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    
    const career = store.updateCareer(id, body)

    if (!career) {
      return NextResponse.json(
        { error: "Career not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(career)
  } catch {
    return NextResponse.json(
      { error: "Failed to update career" },
      { status: 500 }
    )
  }
}
