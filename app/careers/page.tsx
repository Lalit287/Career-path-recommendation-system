"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ChatWidget } from "@/components/chat-widget"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CareerCard } from "@/components/careers/career-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Filter } from "lucide-react"

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

const domains = [
  "All Domains",
  "Artificial Intelligence",
  "Web Development",
  "Data Science",
  "Cloud Computing",
  "Cybersecurity",
  "Design",
  "DevOps",
  "Product Management",
]

const difficulties = ["All Levels", "Beginner", "Intermediate", "Advanced", "Expert"]

function CareersPageContent() {
  const searchParams = useSearchParams()
  const [careers, setCareers] = useState<Career[]>([])
  const [domains, setDomains] = useState<string[]>(["All Domains"])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [domain, setDomain] = useState(searchParams.get("domain") || "All Domains")
  const [difficulty, setDifficulty] = useState("All Levels")

  // Fetch available domains on mount
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await fetch("/api/careers/domains")
        const data = await response.json()
        setDomains(data.domains)
      } catch (error) {
        console.error("Failed to fetch domains:", error)
      }
    }
    fetchDomains()
  }, [])

  useEffect(() => {
    const fetchCareers = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        const normalizedSearch = search.trim()
        if (normalizedSearch) params.set("search", normalizedSearch)
        if (domain && domain !== "All Domains") params.set("domain", domain)
        if (difficulty && difficulty !== "All Levels") params.set("difficulty", difficulty)

        const response = await fetch(`/api/careers?${params.toString()}`)
        const data = await response.json()
        setCareers(data.careers)
      } catch (error) {
        console.error("Failed to fetch careers:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCareers()
  }, [search, domain, difficulty])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-3xl font-bold md:text-4xl">
              Explore <span className="text-primary">Job Roles</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Browse through various career paths, learn about required skills, 
              salary ranges, and future scope
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search careers, skills..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>
            <div className="flex gap-2">
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results count */}
          {!isLoading && (
            <p className="mb-6 text-sm text-muted-foreground">
              Showing {careers.length} career{careers.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* Career Cards */}
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-4 rounded-lg border p-6">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : careers.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {careers.map((career) => (
                <CareerCard key={career.id} career={career} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-lg text-muted-foreground">
                No careers found matching your criteria
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearch("")
                  setDomain("All Domains")
                  setDifficulty("All Levels")
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}

function CareersPageFallback() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-3xl font-bold md:text-4xl">
              Explore <span className="text-primary">Job Roles</span>
            </h1>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4 rounded-lg border p-6">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}

export default function CareersPage() {
  return (
    <Suspense fallback={<CareersPageFallback />}>
      <CareersPageContent />
    </Suspense>
  )
}
