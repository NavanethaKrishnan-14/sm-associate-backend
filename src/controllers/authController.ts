import { Request, Response } from "express";
import { User } from "../models/User";
import { comparePassword, hashPassword, signToken } from "../utils/auth";

export async function login(req: Request, res: Response) {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !user.isActive || !(await comparePassword(password, user.passwordHash))) {
    return res.status(401).json({ success: false, message: "Invalid email or password." });
  }

  const token = signToken({ userId: String(user._id), role: user.role as "ADMIN" | "STAFF" });
  return res.json({
    success: true,
    data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } }
  });
}

export async function me(req: Request, res: Response) {
  res.json({ success: true, data: req.user });
}

export async function createUser(req: Request, res: Response) {
  const name = String(req.body.name ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  const role = req.body.role === "ADMIN" ? "ADMIN" : "STAFF";

  if (!name || !email || password.length < 8) {
    return res.status(400).json({ success: false, message: "Name, valid email and a password of at least 8 characters are required." });
  }

  const exists = await User.exists({ email });
  if (exists) return res.status(409).json({ success: false, message: "A user with this email already exists." });

  const user = await User.create({ name, email, passwordHash: await hashPassword(password), role });
  res.status(201).json({ success: true, data: { id: user._id, name, email, role } });
}
