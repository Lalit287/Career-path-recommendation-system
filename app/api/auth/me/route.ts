import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { getAuthCookie, verifyToken } from "@/lib/jwt"

export async function GET() {
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

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        education: user.education,
        skills: user.skills,
        interests: user.interests,
        savedCareers: user.savedCareers,
        savedRoadmaps: user.savedRoadmaps,
        isAdmin: user.isAdmin,
      },
    })
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
