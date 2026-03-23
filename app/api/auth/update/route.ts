import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { getAuthCookie, verifyToken } from "@/lib/jwt"

export async function PUT(request: Request) {
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

    const userIndex = store.users.findIndex((u) => u.id === decoded.userId)

    if (userIndex === -1) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const updates = await request.json()
    
    // Only allow updating certain fields
    const allowedFields = ["name", "education", "skills", "interests", "savedCareers", "savedRoadmaps"]
    const filteredUpdates: Record<string, unknown> = {}
    
    for (const key of allowedFields) {
      if (key in updates) {
        filteredUpdates[key] = updates[key]
      }
    }

    store.users[userIndex] = {
      ...store.users[userIndex],
      ...filteredUpdates,
    }

    const user = store.users[userIndex]

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
    console.error("Update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
