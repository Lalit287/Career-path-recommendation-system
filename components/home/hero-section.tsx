"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, TrendingUp, Target } from "lucide-react"
import { motion } from "framer-motion"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/20 py-20 md:py-32">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 left-0 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AI-Powered Career Guidance</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 text-4xl font-bold tracking-tight text-balance md:text-6xl lg:text-7xl"
          >
            Navigate Your{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Career Path
            </span>{" "}
            with Confidence
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground text-pretty md:text-xl"
          >
            Discover personalized career recommendations, step-by-step learning roadmaps, 
            and expert guidance powered by AI to help you achieve your professional goals.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button size="lg" asChild className="gap-2">
              <Link href="/recommend">
                Start Your Journey
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/careers">Explore Careers</Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-3"
          >
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">50+</span>
              </div>
              <p className="text-sm text-muted-foreground">Career Paths</p>
            </div>
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                <span className="text-3xl font-bold">200+</span>
              </div>
              <p className="text-sm text-muted-foreground">Skills Mapped</p>
            </div>
            <div className="col-span-2 text-center md:col-span-1">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">AI</span>
              </div>
              <p className="text-sm text-muted-foreground">Powered Insights</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
