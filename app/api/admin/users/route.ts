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

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    // Return users without passwords
    const users = store.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      education: u.education,
      skills: u.skills,
      interests: u.interests,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
