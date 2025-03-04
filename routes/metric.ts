import { Router, type Request } from "express";
import { Metric } from "../models/metric";
import { check } from "../middleware/auth";

interface AuthRequest extends Request {
  user?: { id: string; username: string };
}

const router = Router();

// Get metrics based on the selected period
router.get("/:userId/:unique/:period", check, async (req: AuthRequest, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const id = req.user.id;
    const { userId, unique, period } = req.params;

    if (userId !== id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Convert period to number
    const periodNumber = parseInt(period, 10);

    let metrics;
    const now = new Date();

    // Define date ranges
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last1Week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last1Month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (periodNumber === 1) {
      metrics = await Metric.find({ unique_key: unique, timestamp: { $gte: last24Hours } });
    } else if (periodNumber === 2) {
      metrics = await Metric.find({ unique_key: unique, timestamp: { $gte: last1Week } });
    } else if (periodNumber === 3) {
      metrics = await Metric.find({ unique_key: unique, timestamp: { $gte: last1Month } });
    } else if (periodNumber === 4) {
      metrics = await Metric.find({ unique_key: unique });
    } else {
      res.status(400).json({ message: "Invalid period value" });
      return;
    }

    res.json({ metrics });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

export default router;
