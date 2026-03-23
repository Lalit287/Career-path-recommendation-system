import mongoose from "mongoose"

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  education: { type: String, default: "" },
  skills: { type: [String], default: [] },
  interests: { type: [String], default: [] },
  savedCareers: { type: [String], default: [] },
  savedRoadmaps: { type: [String], default: [] },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

export const User = mongoose.models.User || mongoose.model("User", UserSchema)
