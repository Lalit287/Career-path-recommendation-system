"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  Target, 
  Users, 
  Lightbulb, 
  TrendingUp, 
  Award,
  Heart,
  ArrowRight,
  Sparkles,
  Globe,
  Shield
} from "lucide-react"

const stats = [
  { label: "Career Paths", value: "50+", icon: Target },
  { label: "Users Guided", value: "10K+", icon: Users },
  { label: "Roadmaps Created", value: "25K+", icon: TrendingUp },
  { label: "Success Rate", value: "94%", icon: Award },
]

const values = [
  {
    icon: Lightbulb,
    title: "Innovation First",
    description: "We leverage cutting-edge AI to provide personalized career guidance that adapts to the ever-changing job market.",
  },
  {
    icon: Heart,
    title: "User-Centered",
    description: "Every feature we build starts with understanding your needs, challenges, and aspirations in your career journey.",
  },
  {
    icon: Globe,
    title: "Inclusive Access",
    description: "We believe career guidance should be accessible to everyone, regardless of background or experience level.",
  },
  {
    icon: Shield,
    title: "Trust & Privacy",
    description: "Your data is yours. We maintain the highest standards of privacy and security in handling your information.",
  },
]

const team = [
  {
    name: "Sarah Chen",
    role: "CEO & Founder",
    bio: "Former Google PM with 10+ years in EdTech",
  },
  {
    name: "Michael Roberts",
    role: "CTO",
    bio: "AI researcher, previously at OpenAI",
  },
  {
    name: "Emily Park",
    role: "Head of Product",
    bio: "Career counselor turned product leader",
  },
  {
    name: "David Kim",
    role: "Lead Engineer",
    bio: "Full-stack expert, ex-Netflix",
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                About PathFinder
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance">
                Empowering Your Career Journey with AI
              </h1>
              <p className="text-lg text-muted-foreground text-pretty">
                We are on a mission to democratize career guidance, making personalized 
                professional development accessible to everyone through the power of artificial intelligence.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map((stat) => (
                <Card key={stat.label} className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <stat.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">Our Mission</h2>
                  <p className="text-muted-foreground mb-4">
                    In a rapidly evolving job market, finding the right career path can be overwhelming. 
                    Traditional career counseling is often expensive and inaccessible, leaving many 
                    professionals without proper guidance.
                  </p>
                  <p className="text-muted-foreground mb-6">
                    PathFinder was founded to change that. We combine advanced AI with deep career 
                    expertise to provide personalized recommendations, detailed learning roadmaps, 
                    and ongoing support that helps you navigate your professional journey with confidence.
                  </p>
                  <Button asChild>
                    <Link href="/recommend">
                      Get Your Recommendations
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
                <div className="relative">
                  <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <div className="text-center p-8">
                      <Target className="w-16 h-16 text-primary mx-auto mb-4" />
                      <p className="text-lg font-medium text-foreground">
                        &quot;Everyone deserves a clear path to their dream career.&quot;
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">- Sarah Chen, Founder</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">Our Values</h2>
                <p className="text-muted-foreground">
                  The principles that guide everything we do
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                {values.map((value) => (
                  <Card key={value.title} className="border-border/50 bg-card/50">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <value.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                          <p className="text-sm text-muted-foreground">{value.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">Meet Our Team</h2>
                <p className="text-muted-foreground">
                  Passionate experts dedicated to your career success
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {team.map((member) => (
                  <Card key={member.name} className="border-border/50 bg-card/50 text-center">
                    <CardContent className="p-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground">{member.name}</h3>
                      <p className="text-sm text-primary mb-2">{member.role}</p>
                      <p className="text-xs text-muted-foreground">{member.bio}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Ready to Start Your Journey?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join thousands of professionals who have found their ideal career path with PathFinder.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Create Free Account
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/careers">
                    Explore Careers
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
