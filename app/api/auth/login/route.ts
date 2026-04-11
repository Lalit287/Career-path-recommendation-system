import { NextResponse } from "next/server"
import bcryptjs from "bcryptjs"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/models/User"
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

    // Connect to database
    await connectToDatabase()

    // Find user in database
    const user = await User.findOne({ email })

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Compare passwords
    const isValidPassword = await bcryptjs.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Create token
    const token = createToken({ userId: user._id.toString(), email: user.email, isAdmin: Boolean(user.isAdmin) })
    await setAuthCookie(token)

    return NextResponse.json({
      user: {
        id: user._id.toString(),
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
