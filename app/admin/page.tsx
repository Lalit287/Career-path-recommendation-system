"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  MessageSquare, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  X 
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

interface User {
  id: string
  name: string
  email: string
  education: string
  isAdmin: boolean
  createdAt: string
}

interface Feedback {
  id: string
  name: string
  email: string
  message: string
  createdAt: string
}

export default function AdminPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [careers, setCareers] = useState<Career[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCareer, setEditingCareer] = useState<Career | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Career form state
  const [careerForm, setCareerForm] = useState({
    name: "",
    description: "",
    skills: [] as string[],
    salary: { min: 0, max: 0, currency: "INR" },
    difficulty: "Intermediate",
    scope: "",
    domain: "",
    growth: "Medium",
  })
  const [skillInput, setSkillInput] = useState("")

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push("/")
      toast.error("Admin access required")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [careersRes, usersRes, feedbackRes] = await Promise.all([
          fetch("/api/careers"),
          fetch("/api/admin/users"),
          fetch("/api/feedback"),
        ])

        if (careersRes.ok) {
          const data = await careersRes.json()
          setCareers(data.careers)
        }

        if (usersRes.ok) {
          const data = await usersRes.json()
          setUsers(data.users)
        }

        if (feedbackRes.ok) {
          const data = await feedbackRes.json()
          setFeedback(data.feedback)
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.isAdmin) {
      fetchData()
    }
  }, [user])

  const resetForm = () => {
    setCareerForm({
      name: "",
      description: "",
      skills: [],
      salary: { min: 0, max: 0, currency: "INR" },
      difficulty: "Intermediate",
      scope: "",
      domain: "",
      growth: "Medium",
    })
    setEditingCareer(null)
    setSkillInput("")
  }

  const openEditDialog = (career: Career) => {
    setEditingCareer(career)
    setCareerForm({
      name: career.name,
      description: career.description,
      skills: career.skills,
      salary: career.salary,
      difficulty: career.difficulty,
      scope: career.scope,
      domain: career.domain,
      growth: career.growth,
    })
    setIsDialogOpen(true)
  }

  const handleSaveCareer = async () => {
    if (!careerForm.name || !careerForm.description) {
      toast.error("Name and description are required")
      return
    }

    setIsSaving(true)
    try {
      const url = editingCareer
        ? `/api/careers/${editingCareer.id}`
        : "/api/careers"
      const method = editingCareer ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(careerForm),
      })

      if (response.ok) {
        const data = await response.json()
        if (editingCareer) {
          setCareers(careers.map((c) => (c.id === data.career.id ? data.career : c)))
          toast.success("Career updated successfully")
        } else {
          setCareers([...careers, data.career])
          toast.success("Career created successfully")
        }
        setIsDialogOpen(false)
        resetForm()
      } else {
        throw new Error("Failed to save career")
      }
    } catch {
      toast.error("Failed to save career")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCareer = async (careerId: string) => {
    if (!confirm("Are you sure you want to delete this career?")) return

    try {
      const response = await fetch(`/api/careers/${careerId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setCareers(careers.filter((c) => c.id !== careerId))
        toast.success("Career deleted successfully")
      } else {
        throw new Error("Failed to delete career")
      }
    } catch {
      toast.error("Failed to delete career")
    }
  }

  const addSkill = () => {
    if (skillInput.trim() && !careerForm.skills.includes(skillInput.trim())) {
      setCareerForm({
        ...careerForm,
        skills: [...careerForm.skills, skillInput.trim()],
      })
      setSkillInput("")
    }
  }

  const removeSkill = (skill: string) => {
    setCareerForm({
      ...careerForm,
      skills: careerForm.skills.filter((s) => s !== skill),
    })
  }

  if (authLoading || !user?.isAdmin) {
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

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold flex items-center gap-2">
              <LayoutDashboard className="h-8 w-8" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage careers, users, and feedback
            </p>
          </div>

          {/* Stats */}
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Briefcase className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{careers.length}</p>
                    <p className="text-sm text-muted-foreground">Careers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{users.length}</p>
                    <p className="text-sm text-muted-foreground">Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <MessageSquare className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{feedback.length}</p>
                    <p className="text-sm text-muted-foreground">Feedback</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="careers" className="space-y-6">
            <TabsList>
              <TabsTrigger value="careers" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Careers
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="feedback" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Feedback
              </TabsTrigger>
            </TabsList>

            {/* Careers Tab */}
            <TabsContent value="careers">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Manage Careers</CardTitle>
                    <CardDescription>Add, edit, or delete career paths</CardDescription>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) resetForm()
                  }}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Career
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>
                          {editingCareer ? "Edit Career" : "Add New Career"}
                        </DialogTitle>
                        <DialogDescription>
                          Fill in the career details below
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label>Name</Label>
                          <Input
                            value={careerForm.name}
                            onChange={(e) =>
                              setCareerForm({ ...careerForm, name: e.target.value })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Description</Label>
                          <Textarea
                            value={careerForm.description}
                            onChange={(e) =>
                              setCareerForm({ ...careerForm, description: e.target.value })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Domain</Label>
                          <Input
                            value={careerForm.domain}
                            onChange={(e) =>
                              setCareerForm({ ...careerForm, domain: e.target.value })
                            }
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Min Salary (₹)</Label>
                            <Input
                              type="number"
                              value={careerForm.salary.min}
                              onChange={(e) =>
                                setCareerForm({
                                  ...careerForm,
                                  salary: { ...careerForm.salary, min: parseInt(e.target.value) || 0 },
                                })
                              }
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Max Salary (₹)</Label>
                            <Input
                              type="number"
                              value={careerForm.salary.max}
                              onChange={(e) =>
                                setCareerForm({
                                  ...careerForm,
                                  salary: { ...careerForm.salary, max: parseInt(e.target.value) || 0 },
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Difficulty</Label>
                            <Select
                              value={careerForm.difficulty}
                              onValueChange={(value) =>
                                setCareerForm({ ...careerForm, difficulty: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Beginner">Beginner</SelectItem>
                                <SelectItem value="Intermediate">Intermediate</SelectItem>
                                <SelectItem value="Advanced">Advanced</SelectItem>
                                <SelectItem value="Expert">Expert</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label>Growth</Label>
                            <Select
                              value={careerForm.growth}
                              onValueChange={(value) =>
                                setCareerForm({ ...careerForm, growth: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Very High">Very High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label>Skills</Label>
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
                            {careerForm.skills.map((skill) => (
                              <Badge key={skill} variant="secondary" className="gap-1">
                                {skill}
                                <button onClick={() => removeSkill(skill)}>
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label>Future Scope</Label>
                          <Textarea
                            value={careerForm.scope}
                            onChange={(e) =>
                              setCareerForm({ ...careerForm, scope: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveCareer} disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Domain</TableHead>
                          <TableHead>Difficulty</TableHead>
                          <TableHead>Growth</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {careers.map((career) => (
                          <TableRow key={career.id}>
                            <TableCell className="font-medium">{career.name}</TableCell>
                            <TableCell>{career.domain}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{career.difficulty}</Badge>
                            </TableCell>
                            <TableCell>{career.growth}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(career)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCareer(career.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>View all registered users</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Education</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{u.education || "Not specified"}</TableCell>
                            <TableCell>
                              <Badge variant={u.isAdmin ? "default" : "secondary"}>
                                {u.isAdmin ? "Admin" : "User"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Feedback Tab */}
            <TabsContent value="feedback">
              <Card>
                <CardHeader>
                  <CardTitle>Feedback</CardTitle>
                  <CardDescription>User feedback and messages</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : feedback.length > 0 ? (
                    <div className="space-y-4">
                      {feedback.map((f) => (
                        <div key={f.id} className="rounded-lg border p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <div>
                              <p className="font-medium">{f.name}</p>
                              <p className="text-sm text-muted-foreground">{f.email}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(f.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-sm">{f.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">
                      No feedback received yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}
