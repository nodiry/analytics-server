import mongoose from "mongoose";
// Metric Schema: Stores aggregated data at 15-minute intervals
const metricSchema = new mongoose.Schema({
    unique_key: { type: String, required: true, index: true }, // Matches website's unique key
    timestamp: { type: Date, required: true, index: true }, // 15-min interval start time
    totalVisits: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    avgSessionDuration: { type: Number, default: 0 }, // New: Average session duration in seconds
    bounceRate: { type: Number, default: 0 }, // New: Bounce rate percentage
    avgLoadTime: { type: Number, default: 0 },
    pages: [{ url: String, visits: Number, status: Number }],
    referrers: [{ referrer: String, count: Number }],
    deviceStats: {
      desktop: { type: Number, default: 0 }, // New: Desktop users count
      mobile: { type: Number, default: 0 }, // New: Mobile users count
      tablet: { type: Number, default: 0 }, // New: Tablet users count
    },
    geoDistribution: [{ country: String, visits: Number }], // New: Visitors per country
  }, { timestamps: true } );

export const Metric = mongoose.model("Metric", metricSchema);