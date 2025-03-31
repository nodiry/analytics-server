import "bun";
import express from "express";
import jwt from "jsonwebtoken";
import { Dev } from "../models/dev";
import { hash, verify } from "../utils/hash";
import { check } from "../middleware/auth";
import { Quick } from "../models/quick";
import { generatePasscode } from "../utils/key_maker";
import { send } from "../middleware/emailer";
import { Website } from "../models/website";
import { Metric } from "../models/metric";
import { OAuth2Client } from "google-auth-library";
import logger from "../middleware/logger";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const SAUCE = process.env.SAUCE || "chubingo";
interface AuthRequest extends express.Request {
  user?: { id: string; username: string };
}
const router = express.Router();
// ✅ Google Sign-In Route (Existing Users)
router.post("/google/signin", async (req, res): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: "No Google token provided." });
      return;
    }

    // ✅ Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: "Invalid Google token" });
      return;
    }

    const { email } = payload;

    // ✅ Check if user exists
    let user = await Dev.findOne({ email });
    if (!user) {
      res.status(404).json({ error: "User not found. Please sign up first." });
      return;
    }
    if (!user.authorized) {
      const code = generatePasscode();
      await send(user.email, code);
      const quick = new Quick({
        email: user.email,
        passcode: code,
      });
      await quick.save();
      res.status(200).json({ user: "twoauth" });
      return;
    }
    // ✅ Generate JWT
    const authToken = jwt.sign(
      { id: user._id.toString(), username: user.username },
      SAUCE,
      { expiresIn: "1d" }
    );
    const web = await Website.find({ dev: user._id });
    user.password = "";
    // ✅ Set JWT as cookie
    res.cookie("Authorization", `Bearer ${authToken}`, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({ user, web });
  } catch (err) {
    console.error("Google Sign-In Error:", err);
    res.status(500).json({ error: "Google authentication failed" });
  }
});
// **Signup**
router.post("/signup", async (req, res): Promise<void> => {
  try {
    const { username, firstname, email, lastname, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const exists = await Dev.findOne({ username });
    if (exists) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }

    const hashed = await hash(password);
    const newUser = new Dev({
      username,
      firstname,
      lastname,
      password: hashed,
      email,
    });
    await newUser.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
// **Signin**
router.post("/signin", async (req, res): Promise<void> => {
  try {
    const { username, email, password } = req.body;
    if (!(username || (email && password))) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    // Check if it's username or email being passed
    let user = await Dev.findOne({ $or: [{ username }, { email }] });

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isValid = await verify(password, user.password);
    if (!isValid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.SAUCE || "chubingo",
      { expiresIn: "1d" }
    );

    if (user.password) user.password = "";

    if (!user.authorized) {
      const code = generatePasscode();
      await send(user.email, code);
      const quick = new Quick({
        email: user.email,
        passcode: code,
      });
      await quick.save();
      res.status(200).json({ user: "twoauth" });
    }
    const web = await Website.find({ dev: user._id });

    res.cookie("Authorization", `Bearer ${token}`, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.status(200).json({ user, web });
  } catch (error) {
    console.error("Signin Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// **TwoAuth**
router.post("/twoauth", async (req, res): Promise<void> => {
  try {
    const { email, passcode } = req.body;
    if (!email && !passcode) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    // Check if it's username or email being passed
    let found = await Quick.findOneAndDelete({ email: email });

    if (!found) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const num = Number(passcode);
    if (found.passcode !== num) {
      res.status(403).json({ error: "Invalid credentials" });
      return;
    }
    let user = await Dev.findOne({ email });
    if (!user) {
      res.status(404).json({ message: "user does not exist" });
      return;
    }
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.SAUCE || "chubingo",
      { expiresIn: "1d" }
    );

    user.authorized = true;
    await user.save();

    if (user.password) user.password = "";

    res.cookie("Authorization", `Bearer ${token}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });
    const web = await Website.find({ dev: user._id });
    res.status(200).json({ user, web });
  } catch (error) {
    console.error("Signin Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// TwoAuth
router.post("/forgot", async (req, res): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(401).json({ error: "Missing required fields" });
      return;
    }
    const user = await Dev.findOne({ email });
    if (!user) {
      res.status(404).json({ message: "user does not exist" });
      return;
    }
    const token = jwt.sign({ id: user._id, username: user.username }, SAUCE, {
      expiresIn: "1d",
    });
    res.cookie("Authorization", `Bearer ${token}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });
    const code = generatePasscode();
    await send(user.email, code);
    const quick = new Quick({
      email: user.email,
      passcode: code,
    });
    await quick.save();
    res.status(200).json({ go: "twoauth" });
    return;
  } catch (error) {
    logger.error("Signin Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// **User Edit**
router.put("/user", check, async (req, res): Promise<void> => {
  try {
    const { username, firstname, lastname, email, img, password } = req.body;
    console.log(req.body);
    if (!username) {
      res.status(400).json({ error: "Username required" });
      return;
    }

    let user = await Dev.findOne({ username: username });
    console.log(user);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const hashed = password ? await hash(password) : user.password;
    if (!user.password) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    user.firstname = firstname || user.firstname;
    user.lastname = lastname || user.lastname;
    user.email = email || user.email;
    user.img_url = img || user.img_url;
    user.password = hashed || user.password;
    user.modified_at = new Date();
    await user.save();
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
router.delete("/user", check, async (req, res): Promise<void> => {
  try {
    const username = req.body;
    if (!username) {
      res.status(400).json({ error: "Username required" });
      return;
    }

    const user = await Dev.findOne({ username });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Fetch all websites related to this user
    const websites = await Website.find({ dev: user._id });

    // Delete all related data concurrently
    await Promise.all(
      websites.map(async (website) => {
        await Metric.deleteMany({ unique_key: website.unique_key });
        await Website.deleteOne({ unique_key: website.unique_key });
      })
    );

    // Finally, delete the user
    await Dev.deleteOne({ username: username });

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/google/signup", async (req, res): Promise<void> => {
  try {
    const { token } = req.body;

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({ error: "Invalid Google token" });
      return;
    }

    const { sub, email, name, picture } = payload;

    // Check if user exists
    let user = await Dev.findOne({ email });

    if (!user && email !== undefined) {
      // Auto-create user without password
      user = new Dev({
        googleId: sub,
        email,
        username: email.split("@")[0],
        firstname: name,
        image_url: picture,
      });
      await user.save();
    }
    if (!user || !user._id || !user.username) {
      res.status(500).json({ error: "User creation failed." });
      return;
    }
    // Generate JWT
    const authToken = jwt.sign(
      { id: user._id, username: user.username },
      SAUCE,
      { expiresIn: "1d" }
    );

    // Set JWT as cookie for consistency
    res.cookie("Authorization", `Bearer ${authToken}`, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({ user, web: [] });
  } catch (err) {
    console.error("Google Auth Error:", err);
    res.status(500).json({ error: "Google authentication failed" });
  }
});

router.post("/logout", check, async (req, res): Promise<void> => {
  try {
    res.clearCookie("Authorization", {
      httpOnly: true, // Secure, prevents JavaScript access
      secure: true, // Only send over HTTPS
      sameSite: "strict", // Prevent CSRF attacks
      path: "/", // Clear cookie for entire domain
    });
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    logger.error("error happened while logging out" + error);
    res.status(500).json({ message: "error happened while logging out" });
  }
});

export default router;