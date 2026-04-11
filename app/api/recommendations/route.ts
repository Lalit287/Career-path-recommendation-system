import { NextResponse } from "next/server"
import { getCareersList } from "@/lib/careers-data"
import type { StoredCareer } from "@/lib/store"

interface RecommendationRequest {
  education: string
  interests: string[]
  skills?: string[]
}

const INTEREST_ALIASES: Record<string, string[]> = {
  "artificial intelligence": ["Machine Learning & AI", "Artificial Intelligence", "Data Science & Analytics"],
  "web development": ["Web Development", "Software Development"],
  "data science": ["Data Science", "Data Science & Analytics"],
  "cloud computing": ["Cloud Computing", "Cloud & DevOps"],
  "ui/ux design": ["UI/UX Design", "UI/UX & Product Design", "Design"],
}

function normalizeEducation(education: string): "high school" | "self-taught" | "bachelor" | "master" | "phd" | "unknown" {
  const e = education.toLowerCase().trim()
  if (e.includes("high-school") || e.includes("high school")) return "high school"
  if (e.includes("self-taught") || e.includes("self taught")) return "self-taught"
  if (e.includes("bachelor")) return "bachelor"
  if (e.includes("master")) return "master"
  if (e.includes("phd") || e.includes("doctorate")) return "phd"
  return "unknown"
}

function difficultyRank(level: string): number {
  const l = level.toLowerCase()
  if (l.includes("beginner")) return 0
  if (l.includes("intermediate")) return 1
  if (l.includes("advanced")) return 2
  if (l.includes("expert")) return 3
  return 1
}

function growthRank(growth: string): number {
  const g = growth.toLowerCase()
  if (g.includes("very high")) return 4
  if (g.includes("high")) return 3
  if (g.includes("medium")) return 2
  if (g.includes("low")) return 1
  return 2
}

function expandInterestAliases(interests: string[]): string[] {
  const out = new Set<string>()
  for (const i of interests) {
    const lower = i.toLowerCase().trim()
    out.add(i)
    const aliases = INTEREST_ALIASES[lower] ?? []
    for (const a of aliases) out.add(a)
  }
  return Array.from(out)
}

function calculateMatchScore(
  career: StoredCareer,
  request: RecommendationRequest
): { score: number; educationFit: number; skillFit: number } {
  let score = 0
  const maxScore = 100
  const hasSkills = request.skills && request.skills.length > 0
  const expandedInterests = expandInterestAliases(request.interests)
  const normalizedEducation = normalizeEducation(request.education)

  // Skill matching (30-50% weight depending on skills availability)
  let skillScore = 0
  let skillFit = 0
  if (hasSkills) {
    const userSkillsLower = request.skills!.map((s) => s.toLowerCase())
    const careerSkillsLower = career.skills.map((s) => s.toLowerCase())
    
    const matchingSkills = careerSkillsLower.filter((skill) =>
      userSkillsLower.some((userSkill) =>
        skill.includes(userSkill) || userSkill.includes(skill)
      )
    ).length

    skillScore = careerSkillsLower.length > 0
      ? (matchingSkills / careerSkillsLower.length) * 30
      : 15
    skillFit = careerSkillsLower.length > 0
      ? matchingSkills / careerSkillsLower.length
      : 0.5
  } else {
    // No skills provided - very small baseline to avoid over-ranking expert roles.
    skillScore = 3
    skillFit = 0
  }

  score += skillScore

  // Interest/Domain matching (now with exact match priority)
  let interestWeight = hasSkills ? 45 : 50
  let interestScore = 0

  // Check for EXACT domain match (highest priority)
  const exactDomainMatch = expandedInterests.some(
    (interest) => career.domain.toLowerCase() === interest.toLowerCase()
  )

  if (exactDomainMatch) {
    // Exact domain match gets full points
    interestScore = interestWeight
  } else {
    // Check if interest is contained in domain name
    const partialDomainMatch = expandedInterests.some(
      (interest) =>
        career.domain.toLowerCase().includes(interest.toLowerCase()) ||
        interest.toLowerCase().includes(career.domain.toLowerCase())
    )

    if (partialDomainMatch) {
      interestScore = interestWeight * 0.75
    } else {
      // Check job name
      const nameMatch = expandedInterests.some(
        (interest) =>
          career.name.toLowerCase().includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(career.name.toLowerCase())
      )

      if (nameMatch) {
        interestScore = interestWeight * 0.6
      } else {
        // Check description
        const descriptionMatch = expandedInterests.some(
          (interest) =>
            career.description.toLowerCase().includes(interest.toLowerCase())
        )

        if (descriptionMatch) {
          interestScore = interestWeight * 0.4
        } else {
          // Partial match based on related terms in skills
          const skillMatch = expandedInterests.some((interest) =>
            career.skills.some((skill) =>
              skill.toLowerCase().includes(interest.toLowerCase())
            )
          )
          if (skillMatch) {
            interestScore = interestWeight * 0.25
          }
        }
      }
    }
  }

  score += interestScore

  // Education level matching (20% weight)
  const educationLevels = ["high school", "self-taught", "bachelor", "master", "phd"]
  const userEducationIndex = educationLevels.indexOf(normalizedEducation)
  
  const difficultyLevels = ["Beginner", "Intermediate", "Advanced", "Expert"]
  const careerDifficultyIndex = difficultyLevels.indexOf(career.difficulty)

  let educationScore = 0
  let educationFit = 0
  if (userEducationIndex >= 0 && careerDifficultyIndex >= 0) {
    const educationDiff = Math.abs(userEducationIndex - careerDifficultyIndex)
    educationScore = Math.max(0, 20 - educationDiff * 5)
    educationFit = Math.max(0, 1 - educationDiff / 4)
  } else {
    educationScore = 10 // Default if education can't be matched
    educationFit = 0.5
  }

  score += educationScore

  // Feasibility penalties to avoid over-promising expert recommendations for low-readiness profiles.
  const rank = difficultyRank(career.difficulty)
  let penalty = 0
  if (!hasSkills) {
    if (rank >= 2) penalty += 12
    if (rank >= 3) penalty += 20
  }
  if (normalizedEducation === "high school") {
    if (rank >= 2) penalty += 10
    if (rank >= 3) penalty += 10
  }
  if (normalizedEducation === "self-taught" && rank >= 3) {
    penalty += 8
  }

  score = Math.max(0, score - penalty)

  return {
    score: Math.min(Math.round(score), maxScore),
    educationFit,
    skillFit,
  }
}

export async function POST(request: Request) {
  try {
    const data: RecommendationRequest = await request.json()

    if (!data.education || !Array.isArray(data.interests) || data.interests.length === 0) {
      return NextResponse.json(
        { error: "Education and interests are required" },
        { status: 400 }
      )
    }

    // Skills are optional, default to empty array if not provided
    if (!data.skills) {
      data.skills = []
    }

    const careers = await getCareersList()
    
    // Debug logging
    console.log(`[RECOMMENDATIONS] Received request:`)
    console.log(`  Education: ${data.education}`)
    console.log(`  Interests: ${data.interests.join(", ")}`)
    console.log(`  Skills: ${data.skills.length > 0 ? data.skills.join(", ") : "none"}`)
    console.log(`  Total careers in database: ${careers.length}`)
    
    // Check difficulty distribution
    const diffCounts: Record<string, number> = {}
    careers.forEach(c => {
      diffCounts[c.difficulty] = (diffCounts[c.difficulty] || 0) + 1
    })
    console.log(`  Difficulty distribution:`, diffCounts)

    const ranked = careers.map((career) => {
      const detail = calculateMatchScore(career, data)
      return {
        ...career,
        matchScore: detail.score,
        _educationFit: detail.educationFit,
        _skillFit: detail.skillFit,
        _growthRank: growthRank(career.growth),
      }
    })

    const recommendations = ranked
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
        if (b._educationFit !== a._educationFit) return b._educationFit - a._educationFit
        if (b._skillFit !== a._skillFit) return b._skillFit - a._skillFit
        if (b._growthRank !== a._growthRank) return b._growthRank - a._growthRank
        return a.salary.min - b.salary.min
      })
      .slice(0, 48)
      .map(({ _educationFit, _skillFit, _growthRank, ...career }) => career)
    
    // Debug: show top 5 scores
    console.log(`  Top 5 Scores: ${recommendations.slice(0, 5).map((r, i) => `${i + 1}. ${r.name} (${r.difficulty}): ${r.matchScore}%`).join(" | ")}`)

    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error("Recommendations error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
