"use client"

import { useState, useEffect, use, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ChatWidget } from "@/components/chat-widget"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  X,
} from "lucide-react"

interface RoadmapStep {
  title: string
  description: string
  duration: string
  resources: string[]
  whyThisStage?: string
  requiredSkills?: string[]
  resourceTracks?: {
    free: string[]
    paid: string[]
  }
  decisionBreakpoint?: {
    question: string
    passCriteria: string[]
    alternatePath: string
  }
}

interface Roadmap {
  id: string
  careerId: string
  careerName: string
  steps: RoadmapStep[]
  totalDuration: string
  profileSummary?: {
    age?: number
    currentStage?: string
    qualification?: string
    currentRole?: string
  }
  pathwaySummary?: {
    primaryPath: string
    alternatePath: string
  }
}

interface Career {
  id: string
  name: string
  domain: string
}

const stageOptions = [
  { value: "school-10", label: "School (10th)" },
  { value: "intermediate-11-12", label: "Intermediate (11th/12th)" },
  { value: "diploma", label: "Diploma" },
  { value: "ug", label: "Undergraduate (UG)" },
  { value: "working", label: "Working Professional" },
  { value: "other", label: "Other" },
]

const ROADMAP_PROFILE_STORAGE_KEY = "careerpath-roadmap-profile-v1"
const RECOMMEND_PROFILE_STORAGE_KEY = "careerpath-recommend-profile-v1"

const educationToStageMap: Record<string, string> = {
  "high-school": "school-10",
  bachelor: "ug",
  master: "ug",
  phd: "ug",
  "self-taught": "working",
}

export default function RoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const roadmapId = searchParams.get("roadmapId")
  const { user, updateUser } = useAuth()
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [career, setCareer] = useState<Career | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [currentStage, setCurrentStage] = useState("")
  const [qualification, setQualification] = useState("")
  const [currentRole, setCurrentRole] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")
  const [hasRoadmapLocalState, setHasRoadmapLocalState] = useState(false)
  const hasHydratedFromStorage = useRef(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch career details
        const careerRes = await fetch(`/api/careers/${id}`)
        if (careerRes.ok) {
          const careerData = await careerRes.json()
          setCareer(careerData.career)
        }

        // If opened from profile saved list, load exact roadmap by id.
        if (roadmapId) {
          const roadmapRes = await fetch(`/api/roadmap?roadmapId=${encodeURIComponent(roadmapId)}`)
          if (roadmapRes.ok) {
            const roadmapData = await roadmapRes.json()
            if (roadmapData?.roadmap) {
              setRoadmap(roadmapData.roadmap)
              setCompletedSteps([])
            } else {
              toast.error("Saved roadmap not found")
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id, roadmapId])

  useEffect(() => {
    setIsSaved(Boolean(user && roadmap && user.savedRoadmaps.includes(roadmap.id)))
  }, [user, roadmap])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ROADMAP_PROFILE_STORAGE_KEY)
      const recommendRaw = localStorage.getItem(RECOMMEND_PROFILE_STORAGE_KEY)

      let localApplied = false

      if (raw) {
        const saved = JSON.parse(raw) as {
          dateOfBirth?: string
          currentStage?: string
          qualification?: string
          currentRole?: string
          skills?: string[]
        }

        if (typeof saved.dateOfBirth === "string") {
          setDateOfBirth(saved.dateOfBirth)
          if (saved.dateOfBirth) localApplied = true
        }
        if (typeof saved.currentStage === "string") {
          setCurrentStage(saved.currentStage)
          if (saved.currentStage) localApplied = true
        }
        if (typeof saved.qualification === "string") {
          setQualification(saved.qualification)
          if (saved.qualification) localApplied = true
        }
        if (typeof saved.currentRole === "string") {
          setCurrentRole(saved.currentRole)
          if (saved.currentRole) localApplied = true
        }
        if (Array.isArray(saved.skills)) {
          const savedSkills = saved.skills.filter((s) => typeof s === "string")
          setSkills(savedSkills)
          if (savedSkills.length > 0) localApplied = true
        }
      }

      if (recommendRaw) {
        const recommendSaved = JSON.parse(recommendRaw) as {
          education?: string
          skills?: string[]
        }

        if (!localApplied) {
          const recommendEducation =
            typeof recommendSaved.education === "string" ? recommendSaved.education : ""
          const mappedStage = recommendEducation ? educationToStageMap[recommendEducation] : undefined

          if (mappedStage) {
            setCurrentStage((prev) => prev || mappedStage)
          }

          if (Array.isArray(recommendSaved.skills)) {
            const recommendSkills = recommendSaved.skills.filter((s) => typeof s === "string")
            if (recommendSkills.length > 0) {
              setSkills((prev) => (prev.length > 0 ? prev : recommendSkills))
            }
          }

          if (typeof recommendSaved.education === "string") {
            const recommendEducation = recommendSaved.education
            setQualification((prev) => prev || recommendEducation || "")
          }
        }
      }

      setHasRoadmapLocalState(localApplied)
    } catch {
      // Ignore corrupted local profile state.
    } finally {
      hasHydratedFromStorage.current = true
    }
  }, [])

  useEffect(() => {
    if (!user || !hasHydratedFromStorage.current) return

    if (!hasRoadmapLocalState) {
      setQualification((prev) => prev || user.education || "")
      setSkills((prev) => (prev.length > 0 ? prev : (Array.isArray(user.skills) ? user.skills : [])))
    }
  }, [user, hasRoadmapLocalState])

  useEffect(() => {
    try {
      localStorage.setItem(
        ROADMAP_PROFILE_STORAGE_KEY,
        JSON.stringify({
          dateOfBirth,
          currentStage,
          qualification,
          currentRole,
          skills,
        })
      )
    } catch {
      // Ignore storage write failures.
    }
  }, [dateOfBirth, currentStage, qualification, currentRole, skills])

  const addSkill = () => {
    const v = skillInput.trim()
    if (!v) return
    if (!skills.includes(v)) setSkills((prev) => [...prev, v])
    setSkillInput("")
  }

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill))
  }

  const generateRoadmap = async () => {
    if (!career) return

    const isHighSchoolStage = currentStage === "school-10"

    if (!dateOfBirth || !currentStage || !currentRole.trim()) {
      toast.error("Please fill Date of Birth, current stage, and current role.")
      return
    }

    if (!isHighSchoolStage && !qualification.trim()) {
      toast.error("Please fill your education details.")
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          careerId: career.id,
          careerName: career.name,
          careerDomain: career.domain,
          profile: {
            dateOfBirth,
            currentStage,
            qualification: isHighSchoolStage ? "" : qualification,
            currentRole,
            skills,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setRoadmap(data.roadmap)
        toast.success("Roadmap generated successfully!")
      } else {
        throw new Error("Failed to generate roadmap")
      }
    } catch {
      toast.error("Failed to generate roadmap")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!user) {
      toast.error("Please login to save roadmaps")
      return
    }

    if (!roadmap) return

    const newSavedRoadmaps = isSaved
      ? user.savedRoadmaps.filter((rid) => rid !== roadmap.id)
      : [...user.savedRoadmaps, roadmap.id]

    setIsSaved(!isSaved)
    await updateUser({ savedRoadmaps: newSavedRoadmaps })
    toast.success(isSaved ? "Roadmap removed from saved" : "Roadmap saved to profile")
  }

  const toggleStepComplete = (index: number) => {
    setCompletedSteps((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    )
  }

  const isHighSchoolStage = currentStage === "school-10"

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-12">
            <Skeleton className="mb-4 h-10 w-32" />
            <Skeleton className="mb-8 h-12 w-2/3" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!career) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-12 text-center">
            <h1 className="mb-4 text-2xl font-bold">Career Not Found</h1>
            <Button asChild>
              <Link href="/careers">Browse All Careers</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          {/* Back Button */}
          <Button variant="ghost" asChild className="mb-6 gap-2">
            <Link href={`/careers/${career.id}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to {career.name}
            </Link>
          </Button>

          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold md:text-4xl">
                {career.name} Roadmap
              </h1>
              <p className="text-lg text-muted-foreground">
                Step-by-step guide to becoming a {career.name}
              </p>
            </div>
            {roadmap && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setRoadmap(null)}>
                  Regenerate
                </Button>
                <Button variant="outline" onClick={handleSave} className="gap-2">
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="h-4 w-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {!roadmap ? (
            <Card className="mx-auto max-w-3xl">
              <CardHeader>
                <CardTitle>Generate Your Roadmap</CardTitle>
                <CardDescription>
                  Enter a few key details to generate a personalized path with decision breakpoints and alternate routes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Current Stage</Label>
                    <Select value={currentStage} onValueChange={setCurrentStage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select current stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stageOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {!isHighSchoolStage && (
                    <div className="space-y-2">
                      <Label htmlFor="qualification">Education Details (Course/Stream)</Label>
                      <Input
                        id="qualification"
                        placeholder="e.g. Intermediate MPC, Diploma ECE, B.Tech CSE"
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="role">Current Profession/Role</Label>
                    <Input
                      id="role"
                      placeholder="e.g. Student, Taxi Driver, Accountant"
                      value={currentRole}
                      onChange={(e) => setCurrentRole(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Current Skills (optional but helpful)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill and press Enter"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addSkill()
                        }
                      }}
                    />
                    <Button type="button" variant="secondary" onClick={addSkill}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="gap-1">
                          {skill}
                          <button type="button" onClick={() => removeSkill(skill)}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={generateRoadmap}
                  disabled={isGenerating}
                  className="gap-2"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Personalized Roadmap"
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {roadmap.pathwaySummary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Primary and Alternate Paths</CardTitle>
                    <CardDescription>
                      If one route becomes difficult, switch to the alternate route without losing momentum.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-semibold text-primary mb-1">Primary Path</p>
                      <p className="text-sm text-muted-foreground">{roadmap.pathwaySummary.primaryPath}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-semibold text-primary mb-1">Alternate Path</p>
                      <p className="text-sm text-muted-foreground">{roadmap.pathwaySummary.alternatePath}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Duration Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                  <Clock className="h-4 w-4" />
                  Estimated Duration: {roadmap.totalDuration}
                </Badge>
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                  {completedSteps.length} / {roadmap.steps.length} completed
                </Badge>
              </div>

              {/* Timeline */}
              <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-6 top-0 h-full w-0.5 bg-border" />

                <div className="space-y-6">
                  {roadmap.steps.map((step, index) => {
                    const isCompleted = completedSteps.includes(index)
                    return (
                      <div key={index} className="relative flex gap-4">
                        {/* Step Indicator */}
                        <button
                          onClick={() => toggleStepComplete(index)}
                          className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-background transition-all hover:scale-105"
                          style={{
                            borderColor: isCompleted ? "hsl(var(--primary))" : "hsl(var(--border))",
                          }}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-6 w-6 text-primary" />
                          ) : (
                            <Circle className="h-6 w-6 text-muted-foreground" />
                          )}
                        </button>

                        {/* Step Content */}
                        <Card className={`flex-1 transition-all ${isCompleted ? "opacity-60" : ""}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">
                                  Step {index + 1}: {step.title}
                                </CardTitle>
                                <CardDescription className="mt-1 flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  {step.duration}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              {step.description}
                            </p>

                            {step.whyThisStage && (
                              <div className="rounded-md bg-muted/40 p-3">
                                <p className="text-xs font-semibold text-primary mb-1">Why this stage</p>
                                <p className="text-sm text-muted-foreground">{step.whyThisStage}</p>
                              </div>
                            )}

                            {Array.isArray(step.requiredSkills) && step.requiredSkills.length > 0 && (
                              <div>
                                <p className="mb-2 text-sm font-medium">Required skills in this stage:</p>
                                <div className="flex flex-wrap gap-2">
                                  {step.requiredSkills.map((skill) => (
                                    <Badge key={skill} variant="secondary">{skill}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {step.decisionBreakpoint && (
                              <div className="rounded-md border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Decision Breakpoint</p>
                                <p className="text-sm mb-2">{step.decisionBreakpoint.question}</p>
                                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                                  {step.decisionBreakpoint.passCriteria.map((c, ci) => (
                                    <li key={ci}>{c}</li>
                                  ))}
                                </ul>
                                <p className="text-sm mt-2 text-muted-foreground">
                                  Alternate path: {step.decisionBreakpoint.alternatePath}
                                </p>
                              </div>
                            )}

                            {step.resourceTracks && (
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <p className="mb-2 text-sm font-medium">Free Resources</p>
                                  <div className="flex flex-wrap gap-2">
                                    {step.resourceTracks.free.map((resource, i) => (
                                      <Badge key={`free-${i}`} variant="outline" className="gap-1.5">
                                        {resource}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="mb-2 text-sm font-medium">Paid Resources</p>
                                  <div className="flex flex-wrap gap-2">
                                    {step.resourceTracks.paid.map((resource, i) => (
                                      <Badge key={`paid-${i}`} variant="outline" className="gap-1.5">
                                        {resource}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {!step.resourceTracks && step.resources.length > 0 && (
                              <div>
                                <p className="mb-2 text-sm font-medium">Resources:</p>
                                <div className="flex flex-wrap gap-2">
                                  {step.resources.map((resource, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="gap-1.5 cursor-pointer hover:bg-muted"
                                    >
                                      {resource}
                                      <ExternalLink className="h-3 w-3" />
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
