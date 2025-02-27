import "bun";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import {Website} from "./models/website";
import {Track} from "./models/track";
import auth from "./routes/auth";
import website from "./routes/website";
import metric from "./routes/metric"; // This should stay since we have metric routes
import "./middleware/metric"; // Runs the metric computation in the background
import cors from 'cors';
import cookieParser from "cookie-parser"; // ✅ Import cookie-parser
const app = express();

// Corrected middleware usage
app.use(cors({    
  origin: "http://localhost:5173", // ✅ Replace with your frontend URL
  credentials: true, // ✅ Allow credentials (cookies, auth headers)
})).use(morgan("dev")).use(cookieParser())
.use(express.text()).use(express.json())
.use(express.urlencoded({ extended: true }));

// Routes
app.use("/auth", auth);
app.use("/website", website);
app.use("/metric", metric);

// Database Connection
mongoose
  .connect(process.env.DB || "mongodb://localhost/Analytic")
  .then(() => console.log("✅ DB connected successfully!"))
  .catch((err) => {
    console.error("❌ DB Connection Error:", err);
    process.exit(1);
  });

// Root route
app.get("/", (req, res) => {
  res.send("📊 Amir analytics test call!");
});

// Tracking Route
app.post("/track/:unique", async (req, res):Promise<void> => {
  try {
    const { unique } = req.params;
    const website = await Website.findOne({ unique_key: unique });

    if (!website) {
     res.status(404).json({ error: "Website not found" });
     return;
    }

    // Ensure req.body is valid before accessing properties
    const trackData = new Track({
      unique_key: unique,
      url: req.body?.url || "unknown",
      referrer: req.headers.referer || "direct",
      userAgent: req.headers["user-agent"] || "unknown",
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown",
      timestamp: new Date(),
    });

    await trackData.save();
    res.status(200).json({ message: "Tracking data stored" });
  } catch (error) {
    console.error("❌ Tracking Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));