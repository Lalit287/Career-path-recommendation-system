import { NextResponse } from "next/server"
import { store, generateId } from "@/lib/store"
import { getAuthCookie, verifyToken } from "@/lib/jwt"

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      )
    }

    const feedback = {
      id: generateId(),
      name,
      email,
      message,
      createdAt: new Date(),
    }

    store.feedback.push(feedback)

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

    return NextResponse.json({ feedback: store.feedback })
  } catch (error) {
    console.error("Get feedback error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
