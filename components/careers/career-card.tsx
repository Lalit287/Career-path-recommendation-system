"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, TrendingUp, DollarSign } from "lucide-react"

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

interface Props {
  career: Career
}

const difficultyColors: Record<string, string> = {
  Beginner: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  Intermediate: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  Advanced: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  Expert: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
}

const growthColors: Record<string, string> = {
  Low: "text-muted-foreground",
  Medium: "text-yellow-600 dark:text-yellow-400",
  High: "text-green-600 dark:text-green-400",
  "Very High": "text-emerald-600 dark:text-emerald-400",
}

export function CareerCard({ career }: Props) {
  const formatSalary = (min: number, max: number) => {
    const formatter = new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 0,
    })
    return `$${formatter.format(min)} - $${formatter.format(max)}`
  }

  return (
    <Card className="group flex h-full flex-col transition-all hover:border-primary/50 hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl group-hover:text-primary transition-colors">
              {career.name}
            </CardTitle>
            <CardDescription className="mt-1">{career.domain}</CardDescription>
          </div>
          <Badge
            variant="outline"
            className={difficultyColors[career.difficulty]}
          >
            {career.difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <p className="mb-4 flex-1 text-sm text-muted-foreground line-clamp-3">
          {career.description}
        </p>

        {/* Skills */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {career.skills.slice(0, 4).map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
          {career.skills.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{career.skills.length - 4}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="mb-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>{formatSalary(career.salary.min, career.salary.max)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className={`h-4 w-4 ${growthColors[career.growth]}`} />
            <span className={growthColors[career.growth]}>{career.growth}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
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
  )
}
