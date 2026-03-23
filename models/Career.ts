import mongoose from "mongoose"

const CareerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  skills: { type: [String], default: [] },
  salary: { 
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    currency: { type: String, default: "USD" }
  },
  difficulty: { type: String, enum: ["Beginner", "Intermediate", "Advanced", "Expert"], default: "Intermediate" },
  scope: { type: String, default: "" },
  domain: { type: String, default: "" },
  growth: { type: String, enum: ["Low", "Medium", "High", "Very High"], default: "Medium" },
  createdAt: { type: Date, default: Date.now },
})

export const Career = mongoose.models.Career || mongoose.model("Career", CareerSchema)
