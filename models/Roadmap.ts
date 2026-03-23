import mongoose from "mongoose"

const RoadmapStepSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  duration: { type: String, default: "" },
  resources: { type: [String], default: [] },
})

const RoadmapSchema = new mongoose.Schema({
  careerId: { type: String, required: true },
  careerName: { type: String, required: true },
  steps: { type: [RoadmapStepSchema], default: [] },
  totalDuration: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
})

export const Roadmap = mongoose.models.Roadmap || mongoose.model("Roadmap", RoadmapSchema)
