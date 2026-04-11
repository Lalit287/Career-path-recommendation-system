// In-memory store for when MongoDB is not available
// This allows the app to work in demo mode without a database

export interface StoredUser {
  id: string
  name: string
  email: string
  password: string
  education: string
  skills: string[]
  interests: string[]
  savedCareers: string[]
  savedRoadmaps: string[]
  isAdmin: boolean
  createdAt: Date
}

export interface StoredCareer {
  id: string
  name: string
  description: string
  skills: string[]
  salary: { min: number; max: number; currency: string }
  difficulty: string
  scope: string
  domain: string
  growth: string
  createdAt: Date
}

export interface StoredRoadmap {
  id: string
  careerId: string
  careerName: string
  steps: Array<{
    title: string
    description: string
    duration: string
    resources: string[]
    whyThisStage?: string
    requiredSkills?: string[]
    resourceTracks?: {
      free: string[]
      paid: string[]
    }
    decisionBreakpoint?: {
      question: string
      passCriteria: string[]
      alternatePath: string
    }
  }>
  totalDuration: string
  profileKey?: string
  profileSummary?: {
    age?: number
    currentStage?: string
    qualification?: string
    currentRole?: string
  }
  pathwaySummary?: {
    primaryPath: string
    alternatePath: string
  }
  createdAt: Date
}

export interface StoredFeedback {
  id: string
  name: string
  email: string
  message: string
  createdAt: Date
}

interface GlobalStore {
  users: StoredUser[]
  careers: StoredCareer[]
  roadmaps: StoredRoadmap[]
  feedback: StoredFeedback[]
  sessions: Map<string, string>
}

declare global {
  // eslint-disable-next-line no-var
  var __store: GlobalStore | undefined
}

function getStore(): GlobalStore {
  if (!global.__store) {
    global.__store = {
      users: [
        {
          id: "admin-1",
          name: "Admin User",
          email: "admin@career.com",
          password: "$2a$10$demo-hashed-password",
          education: "Masters",
          skills: ["Leadership", "Management"],
          interests: ["Technology", "Education"],
          savedCareers: [],
          savedRoadmaps: [],
          isAdmin: true,
          createdAt: new Date(),
        },
      ],
      careers: [
        {
          id: "career-1",
          name: "AI/ML Engineer",
          description: "Design and develop artificial intelligence and machine learning systems. Work with neural networks, deep learning, and data processing pipelines.",
          skills: ["Python", "TensorFlow", "PyTorch", "Machine Learning", "Deep Learning", "Mathematics", "Data Structures"],
          salary: { min: 120000, max: 200000, currency: "USD" },
          difficulty: "Advanced",
          scope: "AI is transforming every industry. Demand for AI engineers is growing exponentially with applications in healthcare, finance, autonomous systems, and more.",
          domain: "Artificial Intelligence",
          growth: "Very High",
          createdAt: new Date(),
        },
        {
          id: "career-2",
          name: "Full Stack Developer",
          description: "Build complete web applications from frontend to backend. Work with modern frameworks, databases, and cloud services.",
          skills: ["JavaScript", "React", "Node.js", "SQL", "APIs", "Git", "TypeScript"],
          salary: { min: 80000, max: 150000, currency: "USD" },
          difficulty: "Intermediate",
          scope: "Web development continues to be one of the most in-demand fields with opportunities in startups, enterprises, and freelancing.",
          domain: "Web Development",
          growth: "High",
          createdAt: new Date(),
        },
        {
          id: "career-3",
          name: "Data Scientist",
          description: "Extract insights from complex data using statistical analysis, machine learning, and visualization techniques.",
          skills: ["Python", "R", "SQL", "Statistics", "Machine Learning", "Data Visualization", "Pandas"],
          salary: { min: 100000, max: 180000, currency: "USD" },
          difficulty: "Advanced",
          scope: "Data-driven decision making is crucial for all businesses. Data scientists are essential for turning raw data into actionable insights.",
          domain: "Data Science",
          growth: "Very High",
          createdAt: new Date(),
        },
        {
          id: "career-4",
          name: "Cloud Architect",
          description: "Design and manage cloud infrastructure solutions. Work with AWS, Azure, or GCP to build scalable and secure systems.",
          skills: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Networking"],
          salary: { min: 130000, max: 220000, currency: "USD" },
          difficulty: "Expert",
          scope: "Cloud computing is the backbone of modern technology. Organizations are increasingly moving to cloud-first strategies.",
          domain: "Cloud Computing",
          growth: "Very High",
          createdAt: new Date(),
        },
        {
          id: "career-5",
          name: "Cybersecurity Analyst",
          description: "Protect organizations from cyber threats. Monitor systems, investigate breaches, and implement security measures.",
          skills: ["Network Security", "Penetration Testing", "SIEM", "Firewall", "Cryptography", "Risk Assessment"],
          salary: { min: 90000, max: 160000, currency: "USD" },
          difficulty: "Advanced",
          scope: "With increasing cyber threats, security professionals are more important than ever. Every organization needs robust cybersecurity.",
          domain: "Cybersecurity",
          growth: "Very High",
          createdAt: new Date(),
        },
        {
          id: "career-6",
          name: "Product Manager",
          description: "Lead product strategy and development. Bridge the gap between business, technology, and user experience teams.",
          skills: ["Product Strategy", "User Research", "Agile", "Data Analysis", "Communication", "Roadmapping"],
          salary: { min: 110000, max: 190000, currency: "USD" },
          difficulty: "Intermediate",
          scope: "Product managers are essential for successful product development. The role combines technical understanding with business acumen.",
          domain: "Product Management",
          growth: "High",
          createdAt: new Date(),
        },
        {
          id: "career-7",
          name: "UX/UI Designer",
          description: "Create intuitive and beautiful user experiences. Design interfaces that delight users and solve real problems.",
          skills: ["Figma", "User Research", "Prototyping", "Visual Design", "Interaction Design", "Usability Testing"],
          salary: { min: 75000, max: 140000, currency: "USD" },
          difficulty: "Intermediate",
          scope: "Great design is a competitive advantage. Companies are investing heavily in user experience to differentiate their products.",
          domain: "Design",
          growth: "High",
          createdAt: new Date(),
        },
        {
          id: "career-8",
          name: "DevOps Engineer",
          description: "Automate and optimize software delivery pipelines. Manage infrastructure as code and ensure system reliability.",
          skills: ["CI/CD", "Docker", "Kubernetes", "Linux", "Python", "Monitoring", "AWS"],
          salary: { min: 100000, max: 170000, currency: "USD" },
          difficulty: "Advanced",
          scope: "DevOps practices are essential for modern software development. Companies need engineers who can bridge development and operations.",
          domain: "DevOps",
          growth: "Very High",
          createdAt: new Date(),
        },
      ],
      roadmaps: [],
      feedback: [],
      sessions: new Map(),
    }
  }
  return global.__store
}

export const store = {
  get users() { return getStore().users },
  get careers() { return getStore().careers },
  get roadmaps() { return getStore().roadmaps },
  get feedback() { return getStore().feedback },
  get sessions() { return getStore().sessions },
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
