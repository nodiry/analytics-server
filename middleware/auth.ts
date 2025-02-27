import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthRequest extends Request { 
  user?: { id: string; username: string } 
}

const JWT_SECRET = process.env.JWT_SECRET || "chubingo";

export const check = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // ✅ Check Authorization header first
    let token = req.headers.authorization?.split(" ")[1];

    // ✅ If not in header, check cookies
    if (!token && req.cookies.Authorization) {
      token = req.cookies.Authorization.split(" ")[1]; // Remove "Bearer" if present
    }

    console.log("Extracted Token:", token);

    if (!token) { 
      res.status(401).json({ error: "Access denied. No token provided." });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
    req.user = decoded;
    console.log("Decoded User:", req.user);

    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid or expired token." });
  }
};
