import { NextResponse } from "next/server"
import bcryptjs from "bcryptjs"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/models/User"

export async function POST(request: Request) {
  try {
    const setupToken = process.env.ADMIN_SETUP_TOKEN?.trim()
    const authHeader = request.headers.get("authorization") || ""
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""

    if (!setupToken || bearer !== setupToken) {
      return NextResponse.json(
        { error: "Unauthorized admin setup request" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      )
    }

    await connectToDatabase()

    const adminCount = await User.countDocuments({ isAdmin: true })
    if (adminCount > 0) {
      return NextResponse.json(
        { error: "Admin setup is already completed" },
        { status: 403 }
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })

    if (existingUser) {
      // Update existing user to be admin
      existingUser.isAdmin = true
      await existingUser.save()
      return NextResponse.json({
        message: "User updated to admin",
        user: {
          id: existingUser._id.toString(),
          name: existingUser.name,
          email: existingUser.email,
          isAdmin: existingUser.isAdmin,
        },
      })
    }

    // Create new admin user
    const hashedPassword = await bcryptjs.hash(password, 10)
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      isAdmin: true,
    })

    await newUser.save()

    return NextResponse.json(
      {
        message: "Admin user created successfully",
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          isAdmin: newUser.isAdmin,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Setup admin error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
