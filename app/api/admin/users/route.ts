import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/models/User"
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

    await connectToDatabase()
    const adminUser = await User.findById(decoded.userId)

    if (!adminUser?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    // Fetch all users from database
    const allUsers = await User.find({}).select("-password")
    const users = allUsers.map((u) => ({
      id: u._id.toString(),
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
