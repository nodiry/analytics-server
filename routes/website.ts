import express from "express";
import  {Website}  from "../models/website";
import { generateUniqueKey } from "../utils/key_maker";
import { check } from "../middleware/auth";
import { Metric } from "../models/metric";
interface AuthRequest extends express.Request { user?: { id: string; username: string }}

const router = express.Router();
// **Create a Website**
router.get('/', check, async (req:AuthRequest,res):Promise<void> =>{
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = req.user.id;
    const website = await Website.find({dev:id})
    if(!website) {
      res.status(404).json({message:"No website under this id website."});
      return;
    }
    res.status(200).json({website});
  } catch (error) {
    console.log(error);
  };
});
router.post("/", check, async (req, res):Promise<void> => {
  try {
    const { dev, url, desc } = req.body;
    if (!dev || !url) {res.status(400).json({ error: "Missing required fields" });
     return;}

    const exists = await Website.findOne({ url });
    if (exists) {res.status(409).json({ error: "Website already exists" });
     return;}

    const unique_key = generateUniqueKey(url);
    const website = new Website({ dev, url:url, desc, unique_key });

    await website.save();
    res.status(201).json({ website});
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// **Modify a Website**
router.put("/", check, async (req, res):Promise<void> => {
  try {
    const { unique_key, url, desc } = req.body;
    if (!unique_key) {res.status(400).json({ error: "Unique key required" });
    return;
    }

    const website = await Website.findOne({ unique_key });
    if (!website) { 
      res.status(404).json({ error: "Website not found" });
    return;
    }

    website.desc = desc || website.desc;
    website.url = url || website.url;
    await website.save();

    res.status(200).json({ website });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
// **Delete a Website**
router.delete("/",check, async (req, res):Promise<void> => {
  try {
    const { unique_key } = req.body;
    if (!unique_key) {
       res.status(400).json({ error: "Unique key required" });
      return;
    }

    const website = await Website.findOneAndDelete({ unique_key });
    if (!website) {
      res.status(404).json({ error: "Website not found" });
    return;
    }
    await Metric.deleteMany({unique_key:website.unique_key});

    res.status(200).json({ message: "Website deleted" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/renew", check, async (req: AuthRequest, res): Promise<void> => {
  try {
    const unique_key  = req.body;
    const website = await Website.findOne({ unique_key }).exec();
    if (!website) {
      res.status(404).json({ error: "Website not found" });
      return;
    }
    const metrics = await Metric.find({unique_key}).exec();
    let totalVisits = 0, uniqueVisitors = 0;
    let totalSessionDuration = 0, totalBounceRate = 0;
    const referrersMap = new Map<string, number>();
    const deviceStats = { desktop: 0, mobile: 0, tablet: 0 };
    type PageData = { visits: number; avg_loading_time: number; avg_time_on_page: number };
    const pagesMap = new Map<string, PageData>();

    for (const metric of metrics) {
      totalVisits += metric.totalVisits;
      uniqueVisitors += metric.uniqueVisitors;
      totalSessionDuration += metric.avgSessionDuration;
      totalBounceRate += metric.bounceRate;

      if (Array.isArray(metric.referrers)) {
        for (const ref of metric.referrers) {
          // Skip if referrer is null/undefined.
          if (!ref || !ref.referrer) continue;
          const count = ref.count || 0;
          const current = referrersMap.get(ref.referrer) || 0;
          referrersMap.set(ref.referrer, current + count);
        }
      }

      // Aggregate device stats.
      if (metric.deviceStats) {
        deviceStats.desktop += metric.deviceStats.desktop || 0;
        deviceStats.mobile += metric.deviceStats.mobile || 0;
        deviceStats.tablet += metric.deviceStats.tablet || 0;
      }

      // Aggregate pages. Note: Metric.pages only has 'url' and 'visits'.
      if (Array.isArray(metric.pages)) {
        for (const page of metric.pages) {
          const url = page.url || "";
          if (!url) continue;
          const visits = page.visits || 0;
          // Metric model does not include avg_loading_time or avg_time_on_page; default to 0.
          const avg_loading_time = 0;
          const avg_time_on_page = 0;
          if (pagesMap.has(url)) {
            const existing = pagesMap.get(url)!;
            existing.visits += visits;
          } else pagesMap.set(url, { visits, avg_loading_time, avg_time_on_page });
        }
      }
    }
    const metricsCount = metrics.length;
    const avgSessionDuration = metricsCount > 0 ? totalSessionDuration / metricsCount : 0;
    const bounceRate = metricsCount > 0 ? totalBounceRate / metricsCount : 0;

    const topReferrers = Array.from(referrersMap.entries())
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count);

    const pagesArray = Array.from(pagesMap.entries()).map(([url, data]) => ({
      path: url,
      visits: data.visits,
      avg_loading_time: data.avg_loading_time,
      avg_time_on_page: data.avg_time_on_page,
    }));

    // Update website.stats; we cast as any to satisfy Mongoose's subdocument types.
    website.stats = {
      total_visits: totalVisits,
      monthly_visits: totalVisits,
      daily_visits: totalVisits,
      unique_visitors: uniqueVisitors,
      avg_session_duration: avgSessionDuration,
      bounce_rate: bounceRate,
      top_referrers: topReferrers,
      device_distribution: deviceStats,
      pages: pagesArray,
    } as any;
    website.modified_at = new Date();

    await website.save();
    res.status(200).json({ website });
  } catch (error) {
    console.error("Error in /renew route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;