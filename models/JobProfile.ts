import mongoose from "mongoose"

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

JobProfileSchema.index({ domain: 1, title: 1 })
JobProfileSchema.index({ skillsRequired: 1 })
JobProfileSchema.index({ growthLevel: 1, difficulty: 1 })

export const JobProfile =
  mongoose.models.JobProfile ||
  mongoose.model("JobProfile", JobProfileSchema)
