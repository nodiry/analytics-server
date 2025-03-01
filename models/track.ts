import mongoose from "mongoose";

// Track Schema: Stores raw tracking data for real-time analytics
const trackSchema = new mongoose.Schema(
  {
    unique_key: { type: String, required: true, index: true }, // Matches website's unique key
    url: { type: String, required: true },
    referrer: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now }, // Event timestamp
    userAgent: { type: String, required: true },
    ip: String,
    loadTime: { type: Number, default: 0 }, // Page load time in milliseconds
    session_id: { type: String, required: true, index: true }, // New: Identifies a user's session
    country: { type: String, default: "" }, // New: Approximate geolocation (country-level)
    deviceType: { type: String, enum: ["desktop", "mobile", "tablet"], required: true }, // New: Categorized device type
  },
  { timestamps: true }
);

export const Track = mongoose.model("Track", trackSchema);