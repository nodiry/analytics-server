import mongoose from "mongoose";

const metricSchema = new mongoose.Schema(
  {
    unique_key: { type: String, required: true, index: true }, // Matches website's unique key
    timestamp: { type: Date, required: true, index: true }, // 15-min interval start time
    totalVisits: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    avgLoadTime: { type: Number, default: 0 },
    topPages: [{ url: String, visits: Number, status: Number }],
    topReferrers: [{ referrer: String, count: Number }],
  },
  { timestamps: true }
);

export const Metric = mongoose.model("Metric", metricSchema);
