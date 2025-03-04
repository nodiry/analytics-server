import cron from "node-cron";
import { Track } from "../models/track";
import { Metric } from "../models/metric";

// Helper type for merging our aggregated results
interface AggregatedData {
  unique_key: string;
  totalVisits?: number;
  avgLoadTime?: number;
  pages?: { url: string; visits: number }[];
  referrers?: { referrer: string; count: number }[];
  avgSessionDuration?: number;
  totalSessions?: number;
  bounceRate?: number;
  deviceStats?: { desktop: number; mobile: number; tablet: number };
  geoDistribution?: { country: string; visits: number }[];
}

const computeMetrics = async () => {
  try {
    const now = new Date();

    // 1. Event-Level Aggregation: total visits and avg load time per website for all records.
    const eventAggregation = await Track.aggregate([
      {
        $group: {
          _id: "$unique_key",
          totalVisits: { $sum: 1 },
          avgLoadTime: { $avg: "$loadTime" },
        },
      },
    ]);

    const eventData: { [key: string]: AggregatedData } = {};
    eventAggregation.forEach((doc: any) => {
      eventData[doc._id] = {
        unique_key: doc._id,
        totalVisits: doc.totalVisits,
        avgLoadTime: doc.avgLoadTime,
      };
    });

    // 2. Pages Aggregation: count visits per page URL per website.
    const pagesAggregation = await Track.aggregate([
      {
        $group: {
          _id: { unique_key: "$unique_key", url: "$url" },
          visits: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.unique_key",
          pages: { $push: { url: "$_id.url", visits: "$visits" } },
        },
      },
    ]);
    pagesAggregation.forEach((doc: any) => {
      if (!eventData[doc._id]) eventData[doc._id] = { unique_key: doc._id };
      eventData[doc._id].pages = doc.pages;
    });

    // 3. Referrers Aggregation: count visits per referrer (ignoring empty strings).
    const referrersAggregation = await Track.aggregate([
      { $match: { referrer: { $ne: "" } } },
      {
        $group: {
          _id: { unique_key: "$unique_key", referrer: "$referrer" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.unique_key",
          referrers: { $push: { referrer: "$_id.referrer", count: "$count" } },
        },
      },
    ]);
    referrersAggregation.forEach((doc: any) => {
      if (!eventData[doc._id]) eventData[doc._id] = { unique_key: doc._id };
      eventData[doc._id].referrers = doc.referrers;
    });

    // 4. Session-Level Aggregation:
    //    Group by website and session_id to compute session duration and event count.
    const sessionAggregation = await Track.aggregate([
      {
        $group: {
          _id: { unique_key: "$unique_key", session_id: "$session_id" },
          minTime: { $min: "$timestamp" },
          maxTime: { $max: "$timestamp" },
          deviceType: { $first: "$deviceType" },
          eventCount: { $sum: 1 },
        },
      },
      {
        $project: {
          unique_key: "$_id.unique_key",
          sessionDuration: { $subtract: ["$maxTime", "$minTime"] },
          eventCount: 1,
          deviceType: 1,
        },
      },
      {
        $group: {
          _id: "$unique_key",
          avgSessionDuration: { $avg: "$sessionDuration" },
          totalSessions: { $sum: 1 },
          bounceSessions: {
            $sum: { $cond: [{ $eq: ["$eventCount", 1] }, 1, 0] },
          },
          deviceStatsArray: { $push: "$deviceType" },
        },
      },
      {
        $addFields: {
          bounceRate: {
            $multiply: [{ $divide: ["$bounceSessions", "$totalSessions"] }, 100],
          },
        },
      },
      {
        $project: {
          avgSessionDuration: 1,
          totalSessions: 1,
          bounceRate: 1,
          deviceStatsArray: 1,
        },
      },
    ]);

    const sessionData: { [key: string]: AggregatedData } = {};
    sessionAggregation.forEach((doc: any) => {
      // Initialize device counts for each type.
      const deviceCounts: { desktop: number; mobile: number; tablet: number } = {
        desktop: 0,
        mobile: 0,
        tablet: 0,
      };

      // Count sessions per device type.
      doc.deviceStatsArray.forEach((dt: "desktop" | "mobile" | "tablet") => {
        if (deviceCounts.hasOwnProperty(dt)) deviceCounts[dt]++;
      });

      sessionData[doc._id] = {
        unique_key: doc._id,
        avgSessionDuration: doc.avgSessionDuration,
        totalSessions: doc.totalSessions,
        bounceRate: doc.bounceRate,
        deviceStats: deviceCounts,
      };
    });

    // 5. Geographic Aggregation: Count visits per country per website.
    const geoAggregation = await Track.aggregate([
      { $match: { country: { $ne: "" } } },
      {
        $group: {
          _id: { unique_key: "$unique_key", country: "$country" },
          visits: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.unique_key",
          geoDistribution: {
            $push: { country: "$_id.country", visits: "$visits" },
          },
        },
      },
    ]);
    geoAggregation.forEach((doc: any) => {
      if (!eventData[doc._id]) eventData[doc._id] = { unique_key: doc._id };
      eventData[doc._id].geoDistribution = doc.geoDistribution;
    });

    // 6. Merge Aggregations and create Metric documents.
    //    Merge eventData and sessionData for each unique website.
    const allUniqueKeys = new Set([
      ...Object.keys(eventData),
      ...Object.keys(sessionData),
    ]);

    for (const unique_key of allUniqueKeys) {
      const merged: AggregatedData = {
        unique_key,
        totalVisits: eventData[unique_key]?.totalVisits || 0,
        avgLoadTime: eventData[unique_key]?.avgLoadTime || 0,
        pages: eventData[unique_key]?.pages || [],
        referrers: eventData[unique_key]?.referrers || [],
        geoDistribution: eventData[unique_key]?.geoDistribution || [],
        avgSessionDuration: sessionData[unique_key]?.avgSessionDuration || 0,
        bounceRate: sessionData[unique_key]?.bounceRate || 0,
        deviceStats:
          sessionData[unique_key]?.deviceStats || { desktop: 0, mobile: 0, tablet: 0 },
        totalSessions: sessionData[unique_key]?.totalSessions || 0,
      };

      await Metric.create({
        unique_key: merged.unique_key,
        totalVisits: merged.totalVisits,
        uniqueVisitors: merged.totalSessions, // Using total sessions as unique visitors
        avgSessionDuration: merged.avgSessionDuration,
        bounceRate: merged.bounceRate,
        avgLoadTime: merged.avgLoadTime,
        pages: merged.pages,
        referrers: merged.referrers,
        deviceStats: merged.deviceStats,
        geoDistribution: merged.geoDistribution,
        timestamp: now,
      });
    }

    // Delete all tracking records once processing is complete.
    await Track.deleteMany();
    console.log("📊 Metrics computed for all data and track collection cleared");
  } catch (error) {
    console.error("❌ Metric Computation Failed:", error);
  }
};

// Schedule the metric computation to run every 15 minutes.
cron.schedule("*/15 * * * *", computeMetrics);
console.log("⏳ Metric computation scheduler running...");