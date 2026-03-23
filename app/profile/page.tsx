"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ChatWidget } from "@/components/chat-widget"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { User, Bookmark, GitBranch, Settings, Loader2, X, Plus, ArrowRight } from "lucide-react"

interface Career {
  id: string
  name: string
  domain: string
  difficulty: string
}

const educationOptions = [
  { value: "high-school", label: "High School" },
  { value: "bachelor", label: "Bachelor's Degree" },
  { value: "master", label: "Master's Degree" },
  { value: "phd", label: "PhD/Doctorate" },
  { value: "self-taught", label: "Self-Taught" },
]

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoading: authLoading, updateUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedCareers, setSavedCareers] = useState<Career[]>([])
  const [careersLoading, setCareersLoading] = useState(true)

  const [name, setName] = useState("")
  const [education, setEducation] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [interests, setInterests] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")
  const [interestInput, setInterestInput] = useState("")

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEducation(user.education)
      setSkills(user.skills)
      setInterests(user.interests)

      // Fetch saved careers
      const fetchSavedCareers = async () => {
        if (user.savedCareers.length === 0) {
          setCareersLoading(false)
          return
        }

        try {
          const response = await fetch("/api/careers")
          const data = await response.json()
          const saved = data.careers.filter((c: Career) =>
            user.savedCareers.includes(c.id)
          )
          setSavedCareers(saved)
        } catch (error) {
          console.error("Failed to fetch saved careers:", error)
        } finally {
          setCareersLoading(false)
        }
      }

      fetchSavedCareers()
    }
  }, [user])

  const handleSave = async () => {
    setIsSaving(true)
    const result = await updateUser({
      name,
      education,
      skills,
      interests,
    })

    if (result.success) {
      toast.success("Profile updated successfully")
      setIsEditing(false)
    } else {
      toast.error(result.error || "Failed to update profile")
    }
    setIsSaving(false)
  }

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()])
      setSkillInput("")
    }
  }

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill))
  }

  const addInterest = () => {
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setInterests([...interests, interestInput.trim()])
      setInterestInput("")
    }
  }

  const removeInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest))
  }

  const removeSavedCareer = async (careerId: string) => {
    const newSavedCareers = user?.savedCareers.filter((id) => id !== careerId) || []
    await updateUser({ savedCareers: newSavedCareers })
    setSavedCareers(savedCareers.filter((c) => c.id !== careerId))
    toast.success("Career removed from saved")
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-12">
            <Skeleton className="mb-8 h-12 w-1/3" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">
              Manage your profile and view saved careers
            </p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="saved" className="gap-2">
                <Bookmark className="h-4 w-4" />
                Saved Careers
              </TabsTrigger>
              <TabsTrigger value="roadmaps" className="gap-2">
                <GitBranch className="h-4 w-4" />
                My Roadmaps
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Account Settings
                    </CardTitle>
                    <CardDescription>
                      Update your personal information and preferences
                    </CardDescription>
                  </div>
                  {!isEditing && (
                    <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    ) : (
                      <p className="text-muted-foreground">{user.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <p className="text-muted-foreground">{user.email}</p>
                  </div>

                  {/* Education */}
                  <div className="space-y-2">
                    <Label htmlFor="education">Education Level</Label>
                    {isEditing ? (
                      <Select value={education} onValueChange={setEducation}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select education level" />
                        </SelectTrigger>
                        <SelectContent>
                          {educationOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-muted-foreground">
                        {educationOptions.find((e) => e.value === user.education)?.label || "Not specified"}
                      </p>
                    )}
                  </div>

                  {/* Skills */}
                  <div className="space-y-2">
                    <Label>Skills</Label>
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a skill"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                          />
                          <Button type="button" variant="secondary" onClick={addSkill}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="gap-1">
                              {skill}
                              <button onClick={() => removeSkill(skill)}>
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {user.skills.length > 0 ? (
                          user.skills.map((skill) => (
                            <Badge key={skill} variant="secondary">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-muted-foreground">No skills added</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Interests */}
                  <div className="space-y-2">
                    <Label>Interests</Label>
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add an interest"
                            value={interestInput}
                            onChange={(e) => setInterestInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInterest())}
                          />
                          <Button type="button" variant="secondary" onClick={addInterest}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {interests.map((interest) => (
                            <Badge key={interest} variant="secondary" className="gap-1">
                              {interest}
                              <button onClick={() => removeInterest(interest)}>
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {user.interests.length > 0 ? (
                          user.interests.map((interest) => (
                            <Badge key={interest} variant="secondary">
                              {interest}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-muted-foreground">No interests added</p>
                        )}
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false)
                          setName(user.name)
                          setEducation(user.education)
                          setSkills(user.skills)
                          setInterests(user.interests)
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Saved Careers Tab */}
            <TabsContent value="saved">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bookmark className="h-5 w-5" />
                    Saved Careers
                  </CardTitle>
                  <CardDescription>
                    Careers you&apos;ve bookmarked for later
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {careersLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : savedCareers.length > 0 ? (
                    <div className="space-y-3">
                      {savedCareers.map((career) => (
                        <div
                          key={career.id}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div>
                            <h3 className="font-medium">{career.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {career.domain} • {career.difficulty}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/careers/${career.id}`}>
                                View
                                <ArrowRight className="ml-1 h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeSavedCareer(career.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <Bookmark className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No saved careers yet</p>
                      <Button asChild className="mt-4">
                        <Link href="/careers">Browse Careers</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Roadmaps Tab */}
            <TabsContent value="roadmaps">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    My Roadmaps
                  </CardTitle>
                  <CardDescription>
                    Your saved learning roadmaps
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {user.savedRoadmaps.length > 0 ? (
                    <div className="space-y-3">
                      {user.savedRoadmaps.map((roadmapId) => (
                        <div
                          key={roadmapId}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div>
                            <h3 className="font-medium">Roadmap #{roadmapId.slice(-6)}</h3>
                          </div>
                          <Button size="sm" variant="outline">
                            View Roadmap
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <GitBranch className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No saved roadmaps yet</p>
                      <Button asChild className="mt-4">
                        <Link href="/careers">Generate a Roadmap</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
