import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { getAuthCookie, verifyToken } from "@/lib/jwt"
import {
  getCareerById,
  invalidateCareersCache,
  isUsingMongoJobProfiles,
  apiPartialToJobProfileSet,
  jobProfileToApiCareer,
} from "@/lib/careers-data"
import { JobProfile } from "@/models/JobProfile"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const career = await getCareerById(id)

    if (!career) {
      return NextResponse.json(
        { error: "Career not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ career })
  } catch (error) {
    console.error("Get career error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const updates = await request.json()
    const { id: _omit, ...rest } = updates as Record<string, unknown>

    const useMongo = await isUsingMongoJobProfiles()

    if (useMongo) {
      const $set = apiPartialToJobProfileSet(rest)
      if (Object.keys($set).length === 0) {
        const existing = await getCareerById(id)
        if (!existing) {
          return NextResponse.json(
            { error: "Career not found" },
            { status: 404 }
          )
        }
        return NextResponse.json({ career: existing })
      }

      const updated = await JobProfile.findOneAndUpdate(
        { jobId: id },
        { $set },
        { new: true, runValidators: true }
      ).lean()

      if (!updated) {
        return NextResponse.json(
          { error: "Career not found" },
          { status: 404 }
        )
      }

      invalidateCareersCache()
      const career = jobProfileToApiCareer({
        jobId: updated.jobId,
        title: updated.title,
        domain: updated.domain,
        description: updated.description,
        skillsRequired: updated.skillsRequired,
        salaryRange: updated.salaryRange,
        difficulty: updated.difficulty,
        growthLevel: updated.growthLevel,
        futureScope: updated.futureScope,
        createdAt: updated.createdAt,
      })

      return NextResponse.json({ career })
    }

    const careerIndex = store.careers.findIndex((c) => c.id === id)

    if (careerIndex === -1) {
      return NextResponse.json(
        { error: "Career not found" },
        { status: 404 }
      )
    }

    store.careers[careerIndex] = {
      ...store.careers[careerIndex],
      ...updates,
    }

    return NextResponse.json({ career: store.careers[careerIndex] })
  } catch (error) {
    console.error("Update career error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const useMongo = await isUsingMongoJobProfiles()

    if (useMongo) {
      const result = await JobProfile.deleteOne({ jobId: id })
      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: "Career not found" },
          { status: 404 }
        )
      }
      invalidateCareersCache()
      return NextResponse.json({ success: true })
    }

    const careerIndex = store.careers.findIndex((c) => c.id === id)

    if (careerIndex === -1) {
      return NextResponse.json(
        { error: "Career not found" },
        { status: 404 }
      )
    }

    store.careers.splice(careerIndex, 1)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete career error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
