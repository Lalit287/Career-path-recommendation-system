import fs from "fs"
import path from "path"
import mongoose from "mongoose"

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://career_admin:Iw7roC27zFYqsQLa@se-project.gt6ivyp.mongodb.net/careerpath?retryWrites=true&w=majority"

const SalaryRangeSchema = new mongoose.Schema(
  {
    min: { type: Number, required: true, min: 0 },
    max: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true },
  },
  { _id: false }
)

const EducationalQualificationSchema = new mongoose.Schema(
  {
    minimum: { type: String, required: true, trim: true },
    preferred: { type: [String], default: [] },
    alternative: { type: [String], default: [] },
  },
  { _id: false }
)

const JobProfileSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, unique: true, index: true, trim: true },
    onetSocCode: { type: String, default: null, trim: true },
    title: { type: String, required: true, index: true, trim: true },
    domain: { type: String, required: true, index: true, trim: true },
    description: { type: String, required: true, trim: true },
    rolesResponsibilities: { type: [String], default: [] },
    skillsRequired: { type: [String], default: [] },
    educationalQualification: { type: EducationalQualificationSchema, required: true },
    experienceLevel: { type: String, required: true, trim: true },
    difficulty: { type: String, required: true, trim: true },
    toolsTechnologies: { type: [String], default: [] },
    salaryRange: { type: SalaryRangeSchema, required: true },
    growthLevel: { type: String, required: true, trim: true },
    futureScope: { type: String, required: true, trim: true },
    sourceLastUpdated: { type: String, required: true, trim: true },
  },
  { timestamps: true, collection: "job_profiles" }
)

const JobProfile = mongoose.model("JobProfile", JobProfileSchema)

function transformJob(job) {
  return {
    jobId: job.id,
    onetSocCode: job.onet_soc_code,
    title: job.title,
    domain: job.domain,
    description: job.description,
    rolesResponsibilities: job.roles_responsibilities || [],
    skillsRequired: job.skills_required || [],
    educationalQualification: job.educational_qualification,
    experienceLevel: job.experience_level,
    difficulty: job.difficulty,
    toolsTechnologies: job.tools_technologies || [],
    salaryRange: job.salary_range,
    growthLevel: job.growth_level,
    futureScope: job.future_scope,
    sourceLastUpdated: job.last_updated,
  }
}

async function seedDatabase() {
  try {
    console.log("🔗 Connecting to MongoDB...")
    await mongoose.connect(MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    // Read dataset
    const datasetPath = path.join(process.cwd(), "data", "datasets", "tech_jobs_dataset_v2.json")
    console.log(`📂 Reading dataset from: ${datasetPath}`)
    
    const fileContent = fs.readFileSync(datasetPath, "utf-8")
    const dataset = JSON.parse(fileContent)
    const jobs = dataset.jobs

    console.log(`📊 Found ${jobs.length} jobs in dataset`)

    // Check for existing jobs
    const existingCount = await JobProfile.countDocuments()
    console.log(`📦 Existing job profiles in DB: ${existingCount}`)

    if (existingCount > 0) {
      console.log("⚠️  Database already contains job profiles. Clearing...")
      await JobProfile.deleteMany({})
      console.log("🗑️  Cleared existing data")
    }

    // Transform and insert
    const transformedJobs = jobs.map(transformJob)
    
    console.log(`🚀 Inserting ${transformedJobs.length} jobs...`)
    const result = await JobProfile.insertMany(transformedJobs)
    console.log(`✅ Successfully inserted ${result.length} job profiles`)

    // Verify
    const newCount = await JobProfile.countDocuments()
    console.log(`📈 Total job profiles in DB: ${newCount}`)

    // Show sample
    const sample = await JobProfile.findOne().limit(1)
    console.log(`\n📋 Sample job profile:`)
    console.log(JSON.stringify(sample, null, 2))

    console.log("\n✨ Seeding completed successfully!")
  } catch (error) {
    console.error("❌ Error during seeding:", error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log("🔌 Disconnected from MongoDB")
  }
}

seedDatabase()
