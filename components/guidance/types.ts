export type GuidanceMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: number
}

export type GuidanceFormState = {
  interestTags: string[]
  age: string
  profession: string
  skills: string
  education: string
  goals: string
}
