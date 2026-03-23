import mongoose from "mongoose"

const DatasetMetadataSchema = new mongoose.Schema(
  {
    datasetName: { type: String, required: true, trim: true },
    version: { type: String, required: true, trim: true },
    lastUpdated: { type: String, required: true, trim: true },
    currency: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    purpose: { type: String, required: true, trim: true },
    totalDomains: { type: Number, required: true, min: 0 },
    domainsCovered: { type: [String], default: [] },
    onetEnriched: { type: Boolean, default: false },
    onetSource: { type: String, default: null, trim: true },
    note: { type: String, default: null, trim: true },
    sources: { type: [String], default: [] },
  },
  { timestamps: true, collection: "dataset_metadata" }
)

DatasetMetadataSchema.index(
  { datasetName: 1, version: 1 },
  { unique: true, name: "uq_dataset_name_version" }
)

export const DatasetMetadata =
  mongoose.models.DatasetMetadata ||
  mongoose.model("DatasetMetadata", DatasetMetadataSchema)
