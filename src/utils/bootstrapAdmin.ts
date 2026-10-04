import { User } from "../models/User";
import { hashPassword } from "./auth";

export async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "SM Associate Admin";

  if (!email || !password) {
    console.warn("ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping admin bootstrap.");
    return;
  }
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters.");

  const existing = await User.findOne({ email });
  if (existing) return;

  await User.create({ name, email, passwordHash: await hashPassword(password), role: "ADMIN", isActive: true });
  console.log(`Initial admin created: ${email}`);
}
