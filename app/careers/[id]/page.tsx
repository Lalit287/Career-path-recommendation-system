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
  ArrowRight,
  TrendingUp,
  DollarSign,
  BarChart3,
  Bookmark,
  BookmarkCheck,
  GitBranch,
  Target,
  Lightbulb,
} from "lucide-react"

interface Career {
  id: string
  name: string
  description: string
  skills: string[]
  salary: { min: number; max: number; currency: string }
  difficulty: string
  scope: string
  domain: string
  growth: string
}

const difficultyColors: Record<string, string> = {
  Beginner: "bg-green-500/10 text-green-600 dark:text-green-400",
  Intermediate: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  Advanced: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  Expert: "bg-red-500/10 text-red-600 dark:text-red-400",
}

const growthColors: Record<string, string> = {
  Low: "text-muted-foreground",
  Medium: "text-yellow-600 dark:text-yellow-400",
  High: "text-green-600 dark:text-green-400",
  "Very High": "text-emerald-600 dark:text-emerald-400",
}

export default function CareerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, updateUser } = useAuth()
  const [career, setCareer] = useState<Career | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    const fetchCareer = async () => {
      try {
        const response = await fetch(`/api/careers/${id}`)
        if (response.ok) {
          const data = await response.json()
          setCareer(data.career)
          setIsSaved(user?.savedCareers?.includes(data.career.id) || false)
        }
      } catch (error) {
        console.error("Failed to fetch career:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCareer()
  }, [id, user])

  const handleSave = async () => {
    if (!user) {
      toast.error("Please login to save careers")
      return
    }

    if (!career) return

    const newSavedCareers = isSaved
      ? user.savedCareers.filter((cid) => cid !== career.id)
      : [...user.savedCareers, career.id]

    setIsSaved(!isSaved)
    await updateUser({ savedCareers: newSavedCareers })
    toast.success(isSaved ? "Career removed from saved" : "Career saved to profile")
  }

  const formatSalary = (min: number, max: number) => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    })
    return `${formatter.format(min)} - ${formatter.format(max)}`
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-12">
            <Skeleton className="mb-4 h-10 w-32" />
            <Skeleton className="mb-8 h-12 w-2/3" />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-60 w-full" />
              </div>
              <Skeleton className="h-80 w-full" />
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
            <p className="mb-6 text-muted-foreground">
              The career you&apos;re looking for doesn&apos;t exist.
            </p>
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
            <Link href="/careers">
              <ArrowLeft className="h-4 w-4" />
              Back to Careers
            </Link>
          </Button>

          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h1 className="text-3xl font-bold md:text-4xl">{career.name}</h1>
                <Badge className={difficultyColors[career.difficulty]}>
                  {career.difficulty}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground">{career.domain}</p>
            </div>
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
              <Button asChild className="gap-2">
                <Link href={`/careers/${career.id}/roadmap`}>
                  <GitBranch className="h-4 w-4" />
                  View Roadmap
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-6 lg:col-span-2">
              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{career.description}</p>
                </CardContent>
              </Card>

              {/* Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Required Skills
                  </CardTitle>
                  <CardDescription>
                    Skills you need to master for this career
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {career.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="px-3 py-1.5">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Future Scope */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Future Scope
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{career.scope}</p>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Career Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">Salary Range</span>
                    </div>
                    <span className="font-medium">
                      {formatSalary(career.salary.min, career.salary.max)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`h-5 w-5 ${growthColors[career.growth]}`} />
                      <span className="text-sm">Growth</span>
                    </div>
                    <span className={`font-medium ${growthColors[career.growth]}`}>
                      {career.growth}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">Difficulty</span>
                    </div>
                    <Badge className={difficultyColors[career.difficulty]}>
                      {career.difficulty}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* CTA */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <h3 className="mb-2 font-semibold">Ready to Start?</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Get a personalized roadmap to become a {career.name}
                  </p>
                  <Button asChild className="w-full gap-2">
                    <Link href={`/careers/${career.id}/roadmap`}>
                      Generate Roadmap
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
