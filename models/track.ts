import mongoose from "mongoose";

const trackSchema = new mongoose.Schema(
  {
    unique_key: { type: String, required: true, index: true }, // Matches website's unique key
    url: { type: String, required: true },
    referrer: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now }, // Remove the `index: true` here
    userAgent: { type: String, required: true },
    ip: String,
    loadTime: { type: Number, default: 0 }, // In milliseconds
  },
  { timestamps: true }
);

// Define the index with TTL (Time-To-Live) for the `timestamp` field
trackSchema.index({ timestamp: 1 }, { expireAfterSeconds: 172800 });

export const Track = mongoose.model("Track", trackSchema);