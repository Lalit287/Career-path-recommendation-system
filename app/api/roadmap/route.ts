import { NextResponse } from "next/server"
import { store, generateId } from "@/lib/store"

// Predefined roadmap templates
const roadmapTemplates: Record<string, Array<{
  title: string
  description: string
  duration: string
  resources: string[]
}>> = {
  "AI/ML Engineer": [
    {
      title: "Python Fundamentals",
      description: "Master Python programming including data structures, OOP, and libraries like NumPy and Pandas",
      duration: "2-3 months",
      resources: ["Python.org Documentation", "Codecademy Python Course", "Automate the Boring Stuff"],
    },
    {
      title: "Mathematics for ML",
      description: "Learn linear algebra, calculus, probability, and statistics essential for ML",
      duration: "2-3 months",
      resources: ["Khan Academy", "3Blue1Brown Linear Algebra", "MIT OpenCourseWare"],
    },
    {
      title: "Machine Learning Basics",
      description: "Understand supervised/unsupervised learning, regression, classification, and clustering",
      duration: "3-4 months",
      resources: ["Andrew Ng's ML Course", "Scikit-learn Documentation", "Hands-On ML Book"],
    },
    {
      title: "Deep Learning",
      description: "Master neural networks, CNNs, RNNs, and frameworks like TensorFlow and PyTorch",
      duration: "3-4 months",
      resources: ["Deep Learning Specialization", "PyTorch Tutorials", "Fast.ai"],
    },
    {
      title: "Specialized AI Topics",
      description: "Explore NLP, Computer Vision, Reinforcement Learning based on interest",
      duration: "2-3 months",
      resources: ["Hugging Face Course", "OpenCV Tutorials", "Spinning Up in RL"],
    },
    {
      title: "Projects & Portfolio",
      description: "Build real-world projects and contribute to open source",
      duration: "Ongoing",
      resources: ["Kaggle Competitions", "GitHub", "Papers With Code"],
    },
  ],
  "Full Stack Developer": [
    {
      title: "HTML, CSS & JavaScript",
      description: "Master web fundamentals including responsive design and ES6+",
      duration: "2-3 months",
      resources: ["MDN Web Docs", "freeCodeCamp", "JavaScript.info"],
    },
    {
      title: "Frontend Framework",
      description: "Learn React or Vue.js for building modern user interfaces",
      duration: "2-3 months",
      resources: ["React Documentation", "Vue.js Guide", "Frontend Masters"],
    },
    {
      title: "Backend Development",
      description: "Master Node.js/Express or Python/Django for server-side development",
      duration: "2-3 months",
      resources: ["Node.js Docs", "Express Guide", "The Odin Project"],
    },
    {
      title: "Databases",
      description: "Learn SQL and NoSQL databases like PostgreSQL and MongoDB",
      duration: "1-2 months",
      resources: ["SQLZoo", "MongoDB University", "PostgreSQL Tutorial"],
    },
    {
      title: "DevOps Basics",
      description: "Understand Git, CI/CD, Docker, and cloud deployment",
      duration: "1-2 months",
      resources: ["GitHub Learning Lab", "Docker Docs", "Vercel/Netlify Guides"],
    },
    {
      title: "Full Stack Projects",
      description: "Build complete applications combining all skills",
      duration: "Ongoing",
      resources: ["Build your own SaaS", "Portfolio Projects", "Open Source Contributions"],
    },
  ],
  "Data Scientist": [
    {
      title: "Python & SQL",
      description: "Master Python for data analysis and SQL for database querying",
      duration: "2-3 months",
      resources: ["DataCamp", "Mode SQL Tutorial", "Python for Data Analysis Book"],
    },
    {
      title: "Statistics & Probability",
      description: "Learn statistical methods, hypothesis testing, and probability theory",
      duration: "2-3 months",
      resources: ["Khan Academy Statistics", "StatQuest", "Think Stats Book"],
    },
    {
      title: "Data Wrangling",
      description: "Master Pandas, data cleaning, and feature engineering",
      duration: "1-2 months",
      resources: ["Pandas Documentation", "Kaggle Courses", "Data Cleaning with Python"],
    },
    {
      title: "Data Visualization",
      description: "Create compelling visualizations with Matplotlib, Seaborn, and Tableau",
      duration: "1-2 months",
      resources: ["Matplotlib Gallery", "Storytelling with Data", "Tableau Public"],
    },
    {
      title: "Machine Learning",
      description: "Apply ML algorithms to solve real data problems",
      duration: "3-4 months",
      resources: ["Scikit-learn Tutorials", "Kaggle Competitions", "Applied ML Course"],
    },
    {
      title: "Domain Expertise & Projects",
      description: "Specialize in a domain and build portfolio projects",
      duration: "Ongoing",
      resources: ["Industry Datasets", "Kaggle Notebooks", "Data Science Blogs"],
    },
  ],
}

// Default roadmap for careers without specific templates
const defaultRoadmap = [
  {
    title: "Foundation Skills",
    description: "Build core competencies required for this career path",
    duration: "2-3 months",
    resources: ["Online courses", "Documentation", "Tutorial websites"],
  },
  {
    title: "Intermediate Concepts",
    description: "Deepen your understanding with more advanced topics",
    duration: "2-3 months",
    resources: ["Specialized courses", "Books", "Video tutorials"],
  },
  {
    title: "Practical Application",
    description: "Apply your knowledge through hands-on projects",
    duration: "2-3 months",
    resources: ["Project-based learning", "Coding challenges", "Workshops"],
  },
  {
    title: "Advanced Topics",
    description: "Master specialized areas within the field",
    duration: "2-3 months",
    resources: ["Advanced courses", "Research papers", "Expert blogs"],
  },
  {
    title: "Portfolio & Networking",
    description: "Build your portfolio and connect with professionals",
    duration: "Ongoing",
    resources: ["GitHub", "LinkedIn", "Industry meetups"],
  },
]

export async function POST(request: Request) {
  try {
    const { careerId, careerName } = await request.json()

    if (!careerId || !careerName) {
      return NextResponse.json(
        { error: "Career ID and name are required" },
        { status: 400 }
      )
    }

    // Check if roadmap already exists
    const existingRoadmap = store.roadmaps.find((r) => r.careerId === careerId)
    if (existingRoadmap) {
      return NextResponse.json({ roadmap: existingRoadmap })
    }

    // Get template or use default
    const steps = roadmapTemplates[careerName] || defaultRoadmap

    // Calculate total duration
    const totalDuration = steps.reduce((acc, step) => {
      const match = step.duration.match(/(\d+)/)
      return acc + (match ? parseInt(match[1]) : 2)
    }, 0)

    const roadmap = {
      id: generateId(),
      careerId,
      careerName,
      steps,
      totalDuration: `${totalDuration}-${totalDuration + 6} months`,
      createdAt: new Date(),
    }

    store.roadmaps.push(roadmap)

    return NextResponse.json({ roadmap })
  } catch (error) {
    console.error("Roadmap error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const careerId = searchParams.get("careerId")

    if (careerId) {
      const roadmap = store.roadmaps.find((r) => r.careerId === careerId)
      return NextResponse.json({ roadmap: roadmap || null })
    }

    return NextResponse.json({ roadmaps: store.roadmaps })
  } catch (error) {
    console.error("Get roadmaps error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
