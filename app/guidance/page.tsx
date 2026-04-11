import type { Metadata } from "next"
import { GuidancePage } from "@/components/guidance/guidance-page"

export const metadata: Metadata = {
  title: "AI Career Guidance | PathFinder",
  description:
    "Get personalized career suggestions based on your interests, skills, and goals with our AI career coach.",
}

export default function GuidanceRoute() {
  return <GuidancePage />
}
