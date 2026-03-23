"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Compass, GitBranch, BarChart3, MessageSquare, BookOpen, Users } from "lucide-react"
import { motion } from "framer-motion"

const features = [
  {
    icon: Compass,
    title: "Career Recommendations",
    description: "Get personalized career suggestions based on your education, interests, and skills using our AI-powered matching system.",
  },
  {
    icon: GitBranch,
    title: "Learning Roadmaps",
    description: "Follow step-by-step learning paths with curated resources, timelines, and milestones for your chosen career.",
  },
  {
    icon: BarChart3,
    title: "Career Comparison",
    description: "Compare multiple careers side by side including salary ranges, growth potential, and required skills.",
  },
  {
    icon: MessageSquare,
    title: "AI Career Assistant",
    description: "Chat with our AI assistant for instant answers about careers, skills, and guidance on your journey.",
  },
  {
    icon: BookOpen,
    title: "Skill Development",
    description: "Track your progress and discover the skills you need to succeed in your target career.",
  },
  {
    icon: Users,
    title: "Job Role Insights",
    description: "Explore detailed information about job roles including responsibilities, salaries, and future scope.",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
}

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Everything You Need to{" "}
            <span className="text-primary">Succeed</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Comprehensive tools and insights to help you make informed decisions about your career.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={itemVariants}>
              <Card className="group h-full transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
