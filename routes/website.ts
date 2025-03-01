import express from "express";
import  {Website}  from "../models/website";
import { generateUniqueKey } from "../utils/key_maker";
import { check } from "../middleware/auth";
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
    const found = await Website.find({dev:id})
    if(!found) {
      res.status(404).json({message:"No website under this id found."});
      return;
    }
    res.status(200).json({websites:found});
  } catch (error) {
    console.log(error);
  };
})
router.post("/", check, async (req, res):Promise<void> => {
  try {
    const { dev, url, desc } = req.body;
    if (!dev || !url) {res.status(400).json({ error: "Missing required fields" });
     return;}

    const exists = await Website.findOne({ url });
    if (exists) {res.status(409).json({ error: "Website already exists" });
     return;}

    const unique_key = generateUniqueKey(url);
    const newWebsite = new Website({ dev, url:url, desc, unique_key });

    await newWebsite.save();
    res.status(201).json({ message: "Website added", unique_key });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// **Modify a Website**
router.put("/", check, async (req, res):Promise<any> => {
  try {
    const { unique_key, desc } = req.body;
    if (!unique_key) return res.status(400).json({ error: "Unique key required" });

    const website = await Website.findOne({ unique_key });
    if (!website) return res.status(404).json({ error: "Website not found" });

    website.desc = desc || website.desc;
    await website.save();

    res.status(200).json({ message: "Website updated" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
// **Delete a Website**
router.delete("/",check, async (req, res):Promise<any> => {
  try {
    const { unique_key } = req.body;
    if (!unique_key) return res.status(400).json({ error: "Unique key required" });

    const website = await Website.findOneAndDelete({ unique_key });
    if (!website) return res.status(404).json({ error: "Website not found" });

    res.status(200).json({ message: "Website deleted" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;