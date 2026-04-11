import { NextResponse } from "next/server"
import bcryptjs from "bcryptjs"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/models/User"
import { createToken, setAuthCookie } from "@/lib/jwt"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body?.password === "string" ? body.password : ""

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Connect to database
    await connectToDatabase()

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10)

    // Create new user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      education: "",
      skills: [],
      interests: [],
      savedCareers: [],
      savedRoadmaps: [],
      isAdmin: false,
    })

    // Create token
    const token = createToken({ userId: newUser._id.toString(), email: newUser.email, isAdmin: Boolean(newUser.isAdmin) })
    await setAuthCookie(token)

    return NextResponse.json({
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        education: newUser.education,
        skills: newUser.skills,
        interests: newUser.interests,
        savedCareers: newUser.savedCareers,
        savedRoadmaps: newUser.savedRoadmaps,
        isAdmin: newUser.isAdmin,
      },
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
