import "bun";
import "./middleware/metric"; // Runs the metric computation in the background
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import auth from "./routes/auth";
import website from "./routes/website";
import metric from "./routes/metric"; // This should stay since we have metric routes
import cors from 'cors';
import cookieParser from "cookie-parser"; // ✅ Import cookie-parser
import config from './config/config';
const app = express();

app.use(cors({ origin:'http://localhost:5173', credentials: true}));
app.use(morgan("dev")).use(cookieParser())
.use(express.text()).use(express.json())
.use(express.urlencoded({ extended: true }));

// Routes
app.use("/auth", auth);
app.use("/web", website);
app.use("/metric", metric);

// Database Connection
mongoose
  .connect(config.db || "mongodb://localhost/Analytic")
  .then(() => console.log("✅ DB connected successfully!"))
  .catch((err) => {
    console.error("❌ DB Connection Error:", err);
    process.exit(1);
  });

// Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));