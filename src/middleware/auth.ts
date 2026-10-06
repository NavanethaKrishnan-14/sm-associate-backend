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

function extractToken(req: Request): string | null {
  const authorization = String(req.headers.authorization ?? "").trim();

  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) return match[1].trim();

    // Backward compatibility for clients that send the JWT without the Bearer prefix.
    if (!authorization.includes(" ")) return authorization;
  }

  // Backward compatibility for mobile clients using common token header names.
  const customToken = req.headers["x-access-token"] ?? req.headers["x-auth-token"];
  if (typeof customToken === "string" && customToken.trim()) return customToken.trim();

  return null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
        code: "AUTH_TOKEN_MISSING"
      });
    }

    const payload = verifyToken(token);
    if (!payload?.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
        code: "AUTH_TOKEN_INVALID"
      });
    }

    const user = await User.findById(payload.userId).select("name email role isActive");
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User account is inactive or not found.",
        code: "AUTH_USER_INVALID"
      });
    }

    req.user = {
      id: String(user._id),
      role: user.role as "ADMIN" | "STAFF",
      name: user.name,
      email: user.email
    };

    return next();
  } catch (error) {
    console.error("Authentication failed:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
      code: "AUTH_TOKEN_INVALID"
    });
  }
}

export function requireRole(...roles: Array<"ADMIN" | "STAFF">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission for this action."
      });
    }
    return next();
  };
}

export const requireAdmin = requireRole("ADMIN");
export const requireStaffOrAdmin = requireRole("ADMIN", "STAFF");
