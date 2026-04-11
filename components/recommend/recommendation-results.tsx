"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, TrendingUp, IndianRupee, BarChart3, Bookmark, BookmarkCheck } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { useState } from "react"

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
  matchScore: number
}

interface Props {
  recommendations: Career[]
  onReset: () => void
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

export function RecommendationResults({ recommendations, onReset }: Props) {
  const { user, updateUser } = useAuth()
  const [savedCareers, setSavedCareers] = useState<string[]>(user?.savedCareers || [])
  const [visibleCount, setVisibleCount] = useState(12)

  const visibleRecommendations = recommendations.slice(0, visibleCount)

  const handleSave = async (careerId: string) => {
    if (!user) {
      toast.error("Please login to save careers")
      return
    }

    const isAlreadySaved = savedCareers.includes(careerId)
    const newSavedCareers = isAlreadySaved
      ? savedCareers.filter((id) => id !== careerId)
      : [...savedCareers, careerId]

    setSavedCareers(newSavedCareers)
    await updateUser({ savedCareers: newSavedCareers })
    
    toast.success(isAlreadySaved ? "Career removed from saved" : "Career saved to profile")
  }

  const formatSalary = (min: number, max: number) => {
    const formatter = new Intl.NumberFormat("en-IN", {
      notation: "compact",
      maximumFractionDigits: 0,
    })
    return `₹${formatter.format(min)} - ₹${formatter.format(max)}`
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onReset} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Start Over
        </Button>
        <Link href="/compare">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Compare Careers
          </Button>
        </Link>
      </div>

      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold">Your Top Career Matches</h2>
        <p className="text-muted-foreground">
          Based on your profile, here are the best career paths for you
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {visibleRecommendations.map((career, index) => (
          <Card
            key={career.id}
            className="group relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg"
          >
            {index === 0 && (
              <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Best Match
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{career.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {career.domain}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSave(career.id)}
                  className="shrink-0"
                >
                  {savedCareers.includes(career.id) ? (
                    <BookmarkCheck className="h-5 w-5 text-primary" />
                  ) : (
                    <Bookmark className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {career.description}
              </p>

              {/* Match Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Match Score</span>
                  <span className="text-primary">{career.matchScore}%</span>
                </div>
                <Progress value={career.matchScore} className="h-2" />
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5">
                {career.skills.slice(0, 4).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {career.skills.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{career.skills.length - 4} more
                  </Badge>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <IndianRupee className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Salary</p>
                  <p className="font-medium text-xs">
                    {formatSalary(career.salary.min, career.salary.max).replace(' - ', '-')}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <TrendingUp className={`mx-auto mb-1 h-4 w-4 ${growthColors[career.growth]}`} />
                  <p className="text-xs text-muted-foreground">Growth</p>
                  <p className="font-medium text-xs">{career.growth}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <BarChart3 className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Level</p>
                  <p className={`font-medium text-xs ${difficultyColors[career.difficulty]}`}>
                    {career.difficulty}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button asChild className="flex-1 gap-2" size="sm">
                  <Link href={`/careers/${career.id}`}>
                    View Details
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/careers/${career.id}/roadmap`}>
                    Roadmap
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {recommendations.length > visibleCount && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((prev) => Math.min(prev + 12, recommendations.length))}
          >
            Show More ({recommendations.length - visibleCount} left)
          </Button>
        </div>
      )}
    </div>
  )
}
