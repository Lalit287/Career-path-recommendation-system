"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ChatWidget } from "@/components/chat-widget"
import { RecommendationForm } from "@/components/recommend/recommendation-form"
import { RecommendationResults } from "@/components/recommend/recommendation-results"

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

export default function RecommendPage() {
  const [recommendations, setRecommendations] = useState<Career[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRecommendations = (careers: Career[]) => {
    setRecommendations(careers)
  }

  const handleReset = () => {
    setRecommendations(null)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <h1 className="mb-4 text-3xl font-bold md:text-4xl">
                Get Your Career{" "}
                <span className="text-primary">Recommendations</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Answer a few questions and our AI will suggest the best career paths for you
              </p>
            </div>

            {recommendations === null ? (
              <RecommendationForm
                onSubmit={handleRecommendations}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            ) : (
              <RecommendationResults
                recommendations={recommendations}
                onReset={handleReset}
              />
            )}
          </div>
        </div>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
