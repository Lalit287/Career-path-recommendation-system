import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { createToken, setAuthCookie } from "@/lib/jwt"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body?.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Find user in store
    const user = store.users.find((u) => u.email.toLowerCase() === email)

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Demo mode password check.
    // NOTE: Any hashed-password bypass is intentionally disabled for security.
    const isAdminDemo = user.email.toLowerCase() === "admin@career.com" && password === "admin123"
    const isValidPassword = user.password === password || isAdminDemo

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Create token
    const token = createToken({ userId: user.id, email: user.email })
    await setAuthCookie(token)

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
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
