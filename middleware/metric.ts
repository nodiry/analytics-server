import cron from "node-cron";
import  {Track}  from "../models/track";
import  {Metric}  from "../models/metric";

const computeMetrics = async () => {
  try {
    const now = new Date();
    const timeFrame = new Date(now.getTime() - 15 * 60 * 1000); // Last 15 min

    // Aggregate metrics
    const aggregatedMetrics = await Track.aggregate([
      { $match: { timestamp: { $gte: timeFrame } } },
      {
        $group: {
          _id: "$unique_key",
          totalVisits: { $sum: 1 },
          uniqueVisitors: { $addToSet: "$userAgent" },
          avgLoadTime: { $avg: "$loadTime" },
          topPages: {
            $push: { url: "$url", visits:"$visits", status: "$status" },
          },
          topReferrers: {
            $push: { referrer: "$referrer" },
          },
        },
      },
    ]);

    for (const data of aggregatedMetrics) {
      await Metric.create({
        unique_key: data._id,
        totalVisits: data.totalVisits,
        uniqueVisitors: data.uniqueVisitors.length,
        avgLoadTime: data.avgLoadTime,
        topPages: data.topPages,
        topReferrers: data.topReferrers,
        timestamp: now,
      });
    }

    // Clean up old track data (keeping it lean)
    //await Track.deleteMany({ timestamp: { $lt: timeFrame } });

    console.log("📊 Metrics computed.");
  } catch (error) {
    console.error("❌ Metric Computation Failed:", error);
  }
};
// Schedule the metric computation
cron.schedule("*/15 * * * *", computeMetrics);

console.log("⏳ Metric computation scheduler running...");