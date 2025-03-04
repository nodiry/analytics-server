import mongoose from "mongoose";

// Website Schema: Stores details about a tracked website
const websiteSchema = new mongoose.Schema({
  dev: { type: mongoose.Schema.Types.ObjectId, ref: "Dev", required: true },
  url: { type: String, required: true },
  desc: { type: String, default: "" },
  unique_key: { type: String, unique: true, required: true }, // Custom 8-char key
  created_at: { type: Date, default: Date.now, immutable: true },
  modified_at: { type: Date },

  stats: {
    total_visits: { type: Number, default: 0 },
    monthly_visits: { type: Number, default: 0 },
    daily_visits: { type: Number, default: 0 },
    unique_visitors: { type: Number, default: 0 }, // New: Unique visitors count
    avg_session_duration: { type: Number, default: 0 }, // New: Average session duration in seconds
    bounce_rate: { type: Number, default: 0 }, // New: Bounce rate percentage
    top_referrers: [{ referrer: String, count: Number }], // New: Top referrers
    device_distribution: {
      desktop: { type: Number, default: 0 }, // New: Count of desktop users
      mobile: { type: Number, default: 0 }, // New: Count of mobile users
      tablet: { type: Number, default: 0 }, // New: Count of tablet users
    },
    pages: [
      {
        path: String,
        visits: Number,
        avg_loading_time: Number,
        avg_time_on_page: { type: Number, default: 0 }, // New: Average time spent on the page (in seconds)
      },
    ],
  },
});

export const Website = mongoose.model("Website", websiteSchema);