"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Brain, Code, Database, Cloud, Shield, Palette } from "lucide-react"
import { motion } from "framer-motion"

const domains = [
  {
    icon: Brain,
    name: "Artificial Intelligence",
    description: "Build intelligent systems and shape the future of technology",
    careers: ["AI Engineer", "ML Researcher", "Data Scientist"],
    color: "from-blue-500/20 to-cyan-500/20",
    borderColor: "hover:border-blue-500/50",
  },
  {
    icon: Code,
    name: "Web Development",
    description: "Create stunning web experiences and applications",
    careers: ["Full Stack Developer", "Frontend Engineer", "Backend Developer"],
    color: "from-green-500/20 to-emerald-500/20",
    borderColor: "hover:border-green-500/50",
  },
  {
    icon: Database,
    name: "Data Science",
    description: "Extract insights and drive decisions with data",
    careers: ["Data Analyst", "Business Intelligence", "Data Engineer"],
    color: "from-purple-500/20 to-pink-500/20",
    borderColor: "hover:border-purple-500/50",
  },
  {
    icon: Cloud,
    name: "Cloud Computing",
    description: "Design and manage scalable cloud infrastructure",
    careers: ["Cloud Architect", "DevOps Engineer", "SRE"],
    color: "from-orange-500/20 to-yellow-500/20",
    borderColor: "hover:border-orange-500/50",
  },
  {
    icon: Shield,
    name: "Cybersecurity",
    description: "Protect systems and data from digital threats",
    careers: ["Security Analyst", "Penetration Tester", "Security Engineer"],
    color: "from-red-500/20 to-rose-500/20",
    borderColor: "hover:border-red-500/50",
  },
  {
    icon: Palette,
    name: "Design",
    description: "Craft beautiful and intuitive user experiences",
    careers: ["UX Designer", "UI Designer", "Product Designer"],
    color: "from-indigo-500/20 to-violet-500/20",
    borderColor: "hover:border-indigo-500/50",
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
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
    },
  },
}

export function DomainsSection() {
  return (
    <section id="domains" className="bg-muted/30 py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Explore Career{" "}
            <span className="text-primary">Domains</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Discover opportunities across various technology and business domains.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {domains.map((domain) => (
            <motion.div key={domain.name} variants={itemVariants}>
              <Link href={`/careers?domain=${encodeURIComponent(domain.name)}`}>
                <Card className={`group h-full cursor-pointer transition-all duration-300 ${domain.borderColor} hover:shadow-lg`}>
                  <CardContent className="p-6">
                    <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${domain.color}`}>
                      <domain.icon className="h-7 w-7 text-foreground" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold">{domain.name}</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      {domain.description}
                    </p>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {domain.careers.map((career) => (
                        <Badge key={career} variant="secondary" className="text-xs">
                          {career}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Explore careers
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
