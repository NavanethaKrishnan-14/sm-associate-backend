import { User } from "../models/User";
import { comparePassword, hashPassword } from "./auth";

export async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "SM Associate Admin";

  if (!email || !password) {
    console.warn("ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping admin bootstrap.");
    return;
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const existing = await User.findOne({ email }).select("+passwordHash");

  if (!existing) {
    await User.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "ADMIN",
      isActive: true
    });
    console.log(`Initial admin created: ${email}`);
    return;
  }

  let changed = false;

  if (existing.name !== name) {
    existing.name = name;
    changed = true;
  }

  if (existing.role !== "ADMIN") {
    existing.role = "ADMIN";
    changed = true;
  }

  if (!existing.isActive) {
    existing.isActive = true;
    changed = true;
  }

  if (!(await comparePassword(password, existing.passwordHash))) {
    existing.passwordHash = await hashPassword(password);
    changed = true;
  }

  if (changed) {
    await existing.save();
    console.log(`Admin credentials synchronized: ${email}`);
  } else {
    console.log(`Admin already configured: ${email}`);
  }
}
