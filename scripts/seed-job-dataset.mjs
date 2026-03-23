import fs from "node:fs/promises"
import path from "node:path"
import mongoose from "mongoose"

const chunkDir = process.env.JOB_DATASET_DIR || path.resolve(process.cwd(), "data/job-dataset-chunks")
const mongoUri = process.env.MONGODB_URI

if (!mongoUri) {
  throw new Error("MONGODB_URI is required to run the seed script.")
}

const salaryRangeSchema = new mongoose.Schema(
  {
    min: Number,
    max: Number,
    currency: String,
  },
  { _id: false }
)

const educationalQualificationSchema = new mongoose.Schema(
  {
    minimum: String,
    preferred: [String],
    alternative: [String],
  },
  { _id: false }
)

const jobProfileSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    onetSocCode: { type: String, default: null },
    title: { type: String, required: true, index: true },
    domain: { type: String, required: true, index: true },
    description: { type: String, required: true },
    rolesResponsibilities: { type: [String], default: [] },
    skillsRequired: { type: [String], default: [] },
    educationalQualification: { type: educationalQualificationSchema, required: true },
    experienceLevel: { type: String, required: true },
    difficulty: { type: String, required: true },
    toolsTechnologies: { type: [String], default: [] },
    salaryRange: { type: salaryRangeSchema, required: true },
    growthLevel: { type: String, required: true },
    futureScope: { type: String, required: true },
    sourceLastUpdated: { type: String, required: true },
  },
  { timestamps: true, collection: "job_profiles" }
)

const datasetMetadataSchema = new mongoose.Schema(
  {
    datasetName: { type: String, required: true },
    version: { type: String, required: true },
    lastUpdated: { type: String, required: true },
    currency: { type: String, required: true },
    country: { type: String, required: true },
    purpose: { type: String, required: true },
    totalDomains: { type: Number, required: true },
    domainsCovered: { type: [String], default: [] },
    onetEnriched: { type: Boolean, default: false },
    onetSource: { type: String, default: null },
    note: { type: String, default: null },
    sources: { type: [String], default: [] },
  },
  { timestamps: true, collection: "dataset_metadata" }
)

datasetMetadataSchema.index({ datasetName: 1, version: 1 }, { unique: true })

const JobProfile = mongoose.models.JobProfile || mongoose.model("JobProfile", jobProfileSchema)
const DatasetMetadata =
  mongoose.models.DatasetMetadata || mongoose.model("DatasetMetadata", datasetMetadataSchema)

function toMetadataDoc(metadata) {
  return {
    datasetName: metadata.dataset_name,
    version: metadata.version,
    lastUpdated: metadata.last_updated,
    currency: metadata.currency,
    country: metadata.country,
    purpose: metadata.purpose,
    totalDomains: metadata.total_domains ?? 0,
    domainsCovered: metadata.domains_covered ?? [],
    onetEnriched: Boolean(metadata.onet_enriched),
    onetSource: metadata.onet_source ?? null,
    note: metadata.note ?? null,
    sources: metadata.sources ?? [],
  }
}

function toJobDoc(job) {
  return {
    jobId: job.id,
    onetSocCode: job.onet_soc_code ?? null,
    title: job.title,
    domain: job.domain,
    description: job.description,
    rolesResponsibilities: job.roles_responsibilities ?? [],
    skillsRequired: job.skills_required ?? [],
    educationalQualification: {
      minimum: job.educational_qualification?.minimum ?? "Not specified",
      preferred: job.educational_qualification?.preferred ?? [],
      alternative: job.educational_qualification?.alternative ?? [],
    },
    experienceLevel: job.experience_level ?? "Not specified",
    difficulty: job.difficulty ?? "Not specified",
    toolsTechnologies: job.tools_technologies ?? [],
    salaryRange: {
      min: job.salary_range?.min ?? 0,
      max: job.salary_range?.max ?? 0,
      currency: job.salary_range?.currency ?? "INR",
    },
    growthLevel: job.growth_level ?? "Not specified",
    futureScope: job.future_scope ?? "Not specified",
    sourceLastUpdated: job.last_updated ?? "Not specified",
  }
}

async function loadChunkFiles(dirPath) {
  const entries = await fs.readdir(dirPath)
  const jsonFiles = entries.filter((name) => name.endsWith(".json")).sort()

  if (jsonFiles.length === 0) {
    throw new Error(`No JSON chunk files found in: ${dirPath}`)
  }

  const chunks = []
  for (const filename of jsonFiles) {
    const fullPath = path.join(dirPath, filename)
    const raw = await fs.readFile(fullPath, "utf8")
    const parsed = JSON.parse(raw)
    chunks.push(parsed)
  }

  return chunks
}

function mergeChunks(chunks) {
  const metadataList = []
  const jobsById = new Map()

  for (const chunk of chunks) {
    if (chunk.metadata) metadataList.push(chunk.metadata)
    for (const job of chunk.jobs ?? []) {
      jobsById.set(job.id, job)
    }
  }

  return {
    metadataList,
    jobs: Array.from(jobsById.values()),
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function validateMetadata(metadata, index) {
  const prefix = `metadata[${index}]`
  const requiredStringFields = [
    "dataset_name",
    "version",
    "last_updated",
    "currency",
    "country",
    "purpose",
  ]

  for (const field of requiredStringFields) {
    if (!isNonEmptyString(metadata?.[field])) {
      throw new Error(`${prefix}.${field} must be a non-empty string`)
    }
  }

  if (typeof metadata.total_domains !== "number" || metadata.total_domains < 0) {
    throw new Error(`${prefix}.total_domains must be a non-negative number`)
  }

  if (metadata.domains_covered && !isStringArray(metadata.domains_covered)) {
    throw new Error(`${prefix}.domains_covered must be an array of strings`)
  }

  if (metadata.sources && !isStringArray(metadata.sources)) {
    throw new Error(`${prefix}.sources must be an array of strings`)
  }
}

function validateJob(job, index) {
  const prefix = `jobs[${index}]`
  const requiredStringFields = [
    "id",
    "title",
    "domain",
    "description",
    "experience_level",
    "difficulty",
    "growth_level",
    "future_scope",
    "last_updated",
  ]

  for (const field of requiredStringFields) {
    if (!isNonEmptyString(job?.[field])) {
      throw new Error(`${prefix}.${field} must be a non-empty string`)
    }
  }

  if (!isStringArray(job.roles_responsibilities ?? [])) {
    throw new Error(`${prefix}.roles_responsibilities must be an array of strings`)
  }

  if (!isStringArray(job.skills_required ?? [])) {
    throw new Error(`${prefix}.skills_required must be an array of strings`)
  }

  if (!isStringArray(job.tools_technologies ?? [])) {
    throw new Error(`${prefix}.tools_technologies must be an array of strings`)
  }

  const eq = job.educational_qualification
  if (!eq || !isNonEmptyString(eq.minimum)) {
    throw new Error(`${prefix}.educational_qualification.minimum must be a non-empty string`)
  }
  if (eq.preferred && !isStringArray(eq.preferred)) {
    throw new Error(`${prefix}.educational_qualification.preferred must be an array of strings`)
  }
  if (eq.alternative && !isStringArray(eq.alternative)) {
    throw new Error(`${prefix}.educational_qualification.alternative must be an array of strings`)
  }

  const salary = job.salary_range
  if (!salary || typeof salary.min !== "number" || typeof salary.max !== "number") {
    throw new Error(`${prefix}.salary_range.min and salary_range.max must be numbers`)
  }
  if (salary.min < 0 || salary.max < 0 || salary.max < salary.min) {
    throw new Error(`${prefix}.salary_range must satisfy 0 <= min <= max`)
  }
  if (!isNonEmptyString(salary.currency)) {
    throw new Error(`${prefix}.salary_range.currency must be a non-empty string`)
  }
}

function validateMergedDataset(merged) {
  if (!Array.isArray(merged.metadataList) || merged.metadataList.length === 0) {
    throw new Error("At least one metadata object is required")
  }
  if (!Array.isArray(merged.jobs) || merged.jobs.length === 0) {
    throw new Error("At least one job is required")
  }

  merged.metadataList.forEach((metadata, index) => validateMetadata(metadata, index))
  merged.jobs.forEach((job, index) => validateJob(job, index))
}

async function seed() {
  const chunks = await loadChunkFiles(chunkDir)
  const merged = mergeChunks(chunks)
  validateMergedDataset(merged)
  console.log(
    `Validation passed: ${merged.metadataList.length} metadata entries, ${merged.jobs.length} jobs`
  )

  await mongoose.connect(mongoUri, { bufferCommands: false })

  let metadataUpserts = 0
  for (const metadata of merged.metadataList) {
    const doc = toMetadataDoc(metadata)
    await DatasetMetadata.updateOne(
      { datasetName: doc.datasetName, version: doc.version },
      { $set: doc },
      { upsert: true }
    )
    metadataUpserts += 1
  }

  const ops = merged.jobs.map((job) => ({
    updateOne: {
      filter: { jobId: job.id },
      update: { $set: toJobDoc(job) },
      upsert: true,
    },
  }))

  if (ops.length > 0) {
    await JobProfile.bulkWrite(ops, { ordered: false })
  }

  console.log(`Seed complete.`)
  console.log(`- Chunks processed: ${chunks.length}`)
  console.log(`- Metadata upserts: ${metadataUpserts}`)
  console.log(`- Job upserts: ${ops.length}`)

  await mongoose.disconnect()
}

seed().catch(async (error) => {
  console.error("Seeding failed:", error)
  try {
    await mongoose.disconnect()
  } catch {
    // ignore disconnect errors
  }
  process.exit(1)
})
