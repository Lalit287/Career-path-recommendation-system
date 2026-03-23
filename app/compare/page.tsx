"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ChatWidget } from "@/components/chat-widget"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { X, Plus, TrendingUp, DollarSign, BarChart3, Lightbulb } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

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

const growthValues: Record<string, number> = {
  Low: 25,
  Medium: 50,
  High: 75,
  "Very High": 100,
}

export default function ComparePage() {
  const [allCareers, setAllCareers] = useState<Career[]>([])
  const [selectedCareers, setSelectedCareers] = useState<Career[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCareers = async () => {
      try {
        const response = await fetch("/api/careers")
        const data = await response.json()
        setAllCareers(data.careers)
      } catch (error) {
        console.error("Failed to fetch careers:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCareers()
  }, [])

  const addCareer = (careerId: string) => {
    if (selectedCareers.length >= 3) return
    const career = allCareers.find((c) => c.id === careerId)
    if (career && !selectedCareers.find((c) => c.id === careerId)) {
      setSelectedCareers([...selectedCareers, career])
    }
  }

  const removeCareer = (careerId: string) => {
    setSelectedCareers(selectedCareers.filter((c) => c.id !== careerId))
  }

  const availableCareers = allCareers.filter(
    (c) => !selectedCareers.find((sc) => sc.id === c.id)
  )

  const formatSalary = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const salaryChartData = selectedCareers.map((career) => ({
    name: career.name.length > 15 ? career.name.substring(0, 15) + "..." : career.name,
    min: career.salary.min,
    max: career.salary.max,
  }))

  const growthChartData = selectedCareers.map((career) => ({
    name: career.name.length > 15 ? career.name.substring(0, 15) + "..." : career.name,
    growth: growthValues[career.growth],
  }))

  const chartConfig = {
    min: {
      label: "Min Salary",
      color: "hsl(var(--chart-1))",
    },
    max: {
      label: "Max Salary",
      color: "hsl(var(--chart-2))",
    },
    growth: {
      label: "Growth",
      color: "hsl(var(--chart-1))",
    },
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-12">
            <Skeleton className="mb-8 h-12 w-1/2" />
            <div className="grid gap-6 md:grid-cols-3">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
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
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-3xl font-bold md:text-4xl">
              Compare <span className="text-primary">Careers</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Select up to 3 careers to compare side by side
            </p>
          </div>

          {/* Career Selector */}
          <div className="mb-8 flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium">Select careers:</span>
            {selectedCareers.map((career) => (
              <Badge
                key={career.id}
                variant="secondary"
                className="gap-1.5 px-3 py-1.5"
              >
                {career.name}
                <button onClick={() => removeCareer(career.id)}>
                  <X className="h-3 w-3 hover:text-destructive" />
                </button>
              </Badge>
            ))}
            {selectedCareers.length < 3 && (
              <Select onValueChange={addCareer}>
                <SelectTrigger className="w-[200px]">
                  <Plus className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Add career" />
                </SelectTrigger>
                <SelectContent>
                  {availableCareers.map((career) => (
                    <SelectItem key={career.id} value={career.id}>
                      {career.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedCareers.length === 0 ? (
            <Card className="mx-auto max-w-lg text-center">
              <CardContent className="py-12">
                <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No Careers Selected</h3>
                <p className="text-muted-foreground">
                  Select careers from the dropdown above to start comparing
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Comparison Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {selectedCareers.map((career) => (
                  <Card key={career.id} className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-6 w-6"
                      onClick={() => removeCareer(career.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <CardHeader>
                      <CardTitle className="pr-8">{career.name}</CardTitle>
                      <Badge variant="outline" className="w-fit">
                        {career.domain}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Salary */}
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {formatSalary(career.salary.min)} - {formatSalary(career.salary.max)}
                        </span>
                      </div>

                      {/* Growth */}
                      <div className="flex items-center gap-2">
                        <TrendingUp className={`h-4 w-4 ${growthColors[career.growth]}`} />
                        <span className={`text-sm ${growthColors[career.growth]}`}>
                          {career.growth} Growth
                        </span>
                      </div>

                      {/* Difficulty */}
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <Badge className={difficultyColors[career.difficulty]}>
                          {career.difficulty}
                        </Badge>
                      </div>

                      {/* Skills */}
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Skills</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {career.skills.slice(0, 5).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {career.skills.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{career.skills.length - 5}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Charts */}
              {selectedCareers.length >= 2 && (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Salary Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Salary Comparison
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={salaryChartData}>
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis tickFormatter={(value) => formatSalary(value)} fontSize={12} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="min" fill="var(--color-min)" radius={4} name="Min Salary" />
                            <Bar dataKey="max" fill="var(--color-max)" radius={4} name="Max Salary" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Growth Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Growth Potential
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={growthChartData}>
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis domain={[0, 100]} fontSize={12} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="growth" fill="var(--color-growth)" radius={4} name="Growth %" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
