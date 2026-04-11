import mongoose from "mongoose"

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

async function checkDatabase() {
  try {
    console.log("🔗 Connecting to MongoDB...")
    await mongoose.connect(MONGODB_URI)
    console.log("✅ Connected to MongoDB\n")

    // Check all domains
    console.log("📊 ALL UNIQUE DOMAINS IN DATABASE:")
    const domains = await JobProfile.distinct("domain")
    domains.forEach((d, i) => console.log(`  ${i + 1}. ${d}`))
    console.log(`\n✅ Total domains: ${domains.length}\n`)

    // Check Software Development jobs
    console.log("🔍 JOBS IN 'Software Development' DOMAIN:")
    const softwareDev = await JobProfile.find({ domain: "Software Development" }).select("title jobId difficulty -_id")
    if (softwareDev.length === 0) {
      console.log("  ❌ NO JOBS FOUND")
    } else {
      softwareDev.forEach((job, i) => {
        console.log(`  ${i + 1}. ${job.title} (${job.difficulty}) - ID: ${job.jobId}`)
      })
    }
    console.log(`\n✅ Total Software Dev jobs: ${softwareDev.length}\n`)

    // Check Data Science jobs
    console.log("🔍 JOBS IN 'Data Science & Analytics' DOMAIN:")
    const dataSci = await JobProfile.find({ domain: "Data Science & Analytics" }).select("title jobId difficulty -_id")
    if (dataSci.length === 0) {
      console.log("  ❌ NO JOBS FOUND")
    } else {
      dataSci.forEach((job, i) => {
        console.log(`  ${i + 1}. ${job.title} (${job.difficulty}) - ID: ${job.jobId}`)
      })
    }
    console.log(`\n✅ Total Data Science jobs: ${dataSci.length}\n`)

    // Count by domain
    console.log("📈 COUNT BY DOMAIN:")
    const counts = await JobProfile.aggregate([
      { $group: { _id: "$domain", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
    counts.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item._id}: ${item.count} jobs`)
    })

  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log("\n🔌 Disconnected from MongoDB")
  }
}

checkDatabase()
