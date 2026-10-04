import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/auth";
import { User } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: "ADMIN" | "STAFF"; name: string; email: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const payload = verifyToken(header.slice(7));
    const user = await User.findById(payload.userId).select("name email role isActive");
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "User account is inactive or not found." });
    }
    req.user = { id: String(user._id), role: user.role as "ADMIN" | "STAFF", name: user.name, email: user.email };
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired authentication token." });
  }
}

export function requireRole(...roles: Array<"ADMIN" | "STAFF">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You do not have permission for this action." });
    }
    next();
  };
}
