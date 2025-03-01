import { Router, type Request } from "express";
import {Metric} from "../models/metric";
import { check } from "../middleware/auth";
interface AuthRequest extends Request {user?:{ id:string, username:string}}
const router = Router();

// Get last 24 hours of metrics for a user & website
router.get("/:userId/:unique",check, async (req:AuthRequest, res):Promise<void> => {
  try {
    if(!req.user){
      res.status(403).json({message:"Forbidden"});
      return;
    }
    const id = req.user.id;
    const { userId, unique } = req.params;
    if(id!==userId){
      res.status(401).json({message:"UnAuthorized"});
      return;
    }
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const metrics = await Metric.find({ unique_key:unique,
      timestamp: { $gte: last24Hours }});

    res.json({ metrics });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

export default router;