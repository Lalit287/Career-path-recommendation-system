import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Feedback } from "@/models/Feedback"
import { getAuthCookie, verifyToken } from "@/lib/jwt"

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    
    const { name, email, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      )
    }

    const feedback = await Feedback.create({
      name,
      email,
      message,
    })

    return NextResponse.json({ success: true, feedback })
  } catch (error) {
    console.error("Feedback error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    await connectToDatabase()
    
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

    const { User } = await import("@/models/User")
    const user = await User.findById(decoded.userId)

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const feedback = await Feedback.find({})
    return NextResponse.json({ feedback })
  } catch (error) {
    console.error("Get feedback error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
