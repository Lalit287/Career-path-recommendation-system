import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/models/User"
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

    // Connect to database
    await connectToDatabase()

    // Find user by ID
    const user = await User.findById(decoded.userId)

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const updates = await request.json()
    
    // Only allow updating certain fields
    const allowedFields = ["name", "education", "skills", "interests", "savedCareers", "savedRoadmaps"]
    
    for (const key of allowedFields) {
      if (key in updates && updates[key] !== undefined) {
        (user as Record<string, unknown>)[key] = updates[key]
      }
    }

    // Save updated user
    await user.save()

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
    console.error("Update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
