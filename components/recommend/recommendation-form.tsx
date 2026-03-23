"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, GraduationCap, Heart, Wrench, Sparkles, Loader2, X } from "lucide-react"

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
  onSubmit: (careers: Career[]) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const educationLevels = [
  { value: "high-school", label: "High School", description: "Currently in or completed high school" },
  { value: "bachelor", label: "Bachelor's Degree", description: "Pursuing or completed undergraduate studies" },
  { value: "master", label: "Master's Degree", description: "Pursuing or completed postgraduate studies" },
  { value: "phd", label: "PhD/Doctorate", description: "Pursuing or completed doctoral studies" },
  { value: "self-taught", label: "Self-Taught", description: "Learning through online resources and practice" },
]

const interestOptions = [
  "Artificial Intelligence", "Web Development", "Mobile Apps", "Data Science",
  "Cloud Computing", "Cybersecurity", "Game Development", "DevOps",
  "Blockchain", "IoT", "Machine Learning", "Product Management",
  "UX Design", "Digital Marketing", "Finance Tech", "Healthcare Tech"
]

const steps = [
  { id: 1, title: "Education", icon: GraduationCap },
  { id: 2, title: "Interests", icon: Heart },
  { id: 3, title: "Skills", icon: Wrench },
  { id: 4, title: "Generate", icon: Sparkles },
]

export function RecommendationForm({ onSubmit, isLoading, setIsLoading }: Props) {
  const [currentStep, setCurrentStep] = useState(1)
  const [education, setEducation] = useState("")
  const [interests, setInterests] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100

  const handleNext = () => {
    if (currentStep === 1 && !education) {
      toast.error("Please select your education level")
      return
    }
    if (currentStep === 2 && interests.length === 0) {
      toast.error("Please select at least one interest")
      return
    }
    if (currentStep === 3 && skills.length === 0) {
      toast.error("Please add at least one skill")
      return
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    )
  }

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills((prev) => [...prev, skillInput.trim()])
      setSkillInput("")
    }
  }

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addSkill()
    }
  }

  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ education, interests, skills }),
      })

      if (!response.ok) {
        throw new Error("Failed to get recommendations")
      }

      const data = await response.json()
      onSubmit(data.recommendations)
      toast.success("Recommendations generated!")
    } catch {
      toast.error("Failed to generate recommendations")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2",
                step.id <= currentStep ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  step.id < currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : step.id === currentStep
                    ? "border-primary bg-primary/10"
                    : "border-muted-foreground/30"
                )}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <span className="hidden text-sm font-medium sm:inline">{step.title}</span>
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && "What's your education level?"}
            {currentStep === 2 && "What are your interests?"}
            {currentStep === 3 && "What skills do you have?"}
            {currentStep === 4 && "Ready to generate recommendations"}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Select the option that best describes your current education"}
            {currentStep === 2 && "Choose the areas you're most passionate about"}
            {currentStep === 3 && "Add skills you already have or are learning"}
            {currentStep === 4 && "Review your inputs and generate personalized career recommendations"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Education */}
          {currentStep === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {educationLevels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setEducation(level.value)}
                  className={cn(
                    "flex flex-col items-start rounded-lg border p-4 text-left transition-all hover:border-primary/50",
                    education === level.value
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <span className="font-medium">{level.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {level.description}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Interests */}
          {currentStep === 2 && (
            <div className="flex flex-wrap gap-2">
              {interestOptions.map((interest) => (
                <Badge
                  key={interest}
                  variant={interests.includes(interest) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer px-3 py-2 text-sm transition-all",
                    interests.includes(interest) && "bg-primary"
                  )}
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </Badge>
              ))}
            </div>
          )}

          {/* Step 3: Skills */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a skill and press Enter (e.g., Python, React, SQL)"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button type="button" onClick={addSkill} variant="secondary">
                  Add
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="gap-1 px-3 py-2"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-1 rounded-full hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Tip: Add technical skills, programming languages, tools, and soft skills
              </p>
            </div>
          )}

          {/* Step 4: Review & Generate */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Education
                  </div>
                  <p className="text-muted-foreground">
                    {educationLevels.find((e) => e.value === education)?.label}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Heart className="h-4 w-4 text-primary" />
                    Interests
                  </div>
                  <p className="text-muted-foreground">
                    {interests.length} selected
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Wrench className="h-4 w-4 text-primary" />
                    Skills
                  </div>
                  <p className="text-muted-foreground">
                    {skills.length} added
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="mb-2 font-medium">Your Profile Summary</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>Interests:</strong> {interests.join(", ")}</p>
                  <p><strong>Skills:</strong> {skills.join(", ")}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {currentStep < steps.length ? (
          <Button onClick={handleNext} className="gap-2">
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Recommendations
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
