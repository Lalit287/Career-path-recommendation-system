import { NextResponse } from "next/server"
import { getCareersList } from "@/lib/careers-data"
import type { StoredCareer } from "@/lib/store"

interface RecommendationRequest {
  education: string
  interests: string[]
  skills: string[]
}

function calculateMatchScore(
  career: StoredCareer,
  request: RecommendationRequest
): number {
  let score = 0
  const maxScore = 100

  // Skill matching (50% weight)
  const userSkillsLower = request.skills.map((s) => s.toLowerCase())
  const careerSkillsLower = career.skills.map((s) => s.toLowerCase())
  
  const matchingSkills = careerSkillsLower.filter((skill) =>
    userSkillsLower.some((userSkill) =>
      skill.includes(userSkill) || userSkill.includes(skill)
    )
  ).length

  const skillScore = careerSkillsLower.length > 0
    ? (matchingSkills / careerSkillsLower.length) * 50
    : 25

  score += skillScore

  // Interest matching (30% weight)
  const interestDomainMatch = request.interests.some(
    (interest) =>
      career.domain.toLowerCase().includes(interest.toLowerCase()) ||
      career.name.toLowerCase().includes(interest.toLowerCase()) ||
      career.description.toLowerCase().includes(interest.toLowerCase())
  )

  if (interestDomainMatch) {
    score += 30
  } else {
    // Partial match based on related terms
    const partialMatch = request.interests.some((interest) =>
      career.skills.some((skill) =>
        skill.toLowerCase().includes(interest.toLowerCase())
      )
    )
    if (partialMatch) {
      score += 15
    }
  }

  // Education level matching (20% weight)
  const educationLevels = ["high school", "bachelor", "master", "phd"]
  const userEducationIndex = educationLevels.findIndex((e) =>
    request.education.toLowerCase().includes(e)
  )
  
  const difficultyLevels = ["Beginner", "Intermediate", "Advanced", "Expert"]
  const careerDifficultyIndex = difficultyLevels.indexOf(career.difficulty)

  if (userEducationIndex >= 0 && careerDifficultyIndex >= 0) {
    const educationDiff = Math.abs(userEducationIndex - careerDifficultyIndex)
    score += Math.max(0, 20 - educationDiff * 5)
  } else {
    score += 10 // Default if education can't be matched
  }

  return Math.min(Math.round(score), maxScore)
}

export async function POST(request: Request) {
  try {
    const data: RecommendationRequest = await request.json()

    if (!data.education || !data.interests || !data.skills) {
      return NextResponse.json(
        { error: "Education, interests, and skills are required" },
        { status: 400 }
      )
    }

    const careers = await getCareersList()

    const recommendations = careers
      .map((career) => ({
        ...career,
        matchScore: calculateMatchScore(career, data),
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6) // Top 6 recommendations

    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error("Recommendations error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
