import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

function getJwtSecret(): string {
  const secret=process.env.JWT_SECRET;
  if(!secret)throw new Error("JWT_SECRET is required.");
  return secret;
}

export type AuthPayload = { userId: string; role: "ADMIN" | "STAFF" };

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "1d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as unknown as AuthPayload;
}
