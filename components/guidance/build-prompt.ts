import type { GuidanceFormState } from "./types"

export function buildGuidancePrompt(form: GuidanceFormState): string {
  const interests = form.interestTags.length > 0 ? form.interestTags.join(", ") : "Not specified"
  const age = form.age.trim()
  const profession = form.profession.trim()
  const skills = form.skills.trim() || "Not specified"
  const goals = form.goals.trim() || "Open to suggestions"

  return `Suggest suitable career paths and personalized guidance for someone with these details:

Age: ${age}
Current profession/role: ${profession}
Interests: ${interests}
Skills: ${skills}
Education level: ${form.education}
Career goals: ${goals}

Please tailor recommendations to this person's life stage and current profession. Provide realistic pathways, relevant roles to explore, skill gaps to address, and clear next steps. Keep the tone supportive and practical.`
}
