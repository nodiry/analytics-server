import mongoose from "mongoose";

const websiteSchema = new mongoose.Schema({
  dev: { type: mongoose.Schema.Types.ObjectId, ref: "Dev", required: true },
  website_url: { type: String, required: true, unique: true },
  desc: { type: String, default: "" },
  unique_key: { type: String, unique: true, required: true }, // Custom 8-char key
  created_at: { type: Date, default: Date.now, immutable: true },
  modified_at: { type: Date },
  stats: {
    total_visits: { type: Number, default: 0 },
    monthly_visits: { type: Number, default: 0 },
    daily_visits: { type: Number, default: 0 },
    pages: [
      {
        path: String,
        status: Number, // HTTP status
        avg_loading_time: Number,
      },
    ],
  },
});

export const Website=mongoose.model("Website", websiteSchema);
