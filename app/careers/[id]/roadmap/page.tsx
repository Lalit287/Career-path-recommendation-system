"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ChatWidget } from "@/components/chat-widget"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
} from "lucide-react"

interface RoadmapStep {
  title: string
  description: string
  duration: string
  resources: string[]
}

interface Roadmap {
  id: string
  careerId: string
  careerName: string
  steps: RoadmapStep[]
  totalDuration: string
}

interface Career {
  id: string
  name: string
  domain: string
}

export default function RoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, updateUser } = useAuth()
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [career, setCareer] = useState<Career | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch career details
        const careerRes = await fetch(`/api/careers/${id}`)
        if (careerRes.ok) {
          const careerData = await careerRes.json()
          setCareer(careerData.career)

          // Check if roadmap exists
          const roadmapRes = await fetch(`/api/roadmap?careerId=${id}`)
          if (roadmapRes.ok) {
            const roadmapData = await roadmapRes.json()
            if (roadmapData.roadmap) {
              setRoadmap(roadmapData.roadmap)
              setIsSaved(user?.savedRoadmaps?.includes(roadmapData.roadmap.id) || false)
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
  }, [id, user])

  const generateRoadmap = async () => {
    if (!career) return

    setIsGenerating(true)
    try {
      const response = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerId: career.id, careerName: career.name }),
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
            <Card className="mx-auto max-w-lg text-center">
              <CardHeader>
                <CardTitle>Generate Your Roadmap</CardTitle>
                <CardDescription>
                  Get a personalized learning path with curated resources and timelines
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                    "Generate Roadmap"
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
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

                            {step.resources.length > 0 && (
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
