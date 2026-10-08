import { prisma } from "../config/db";
import { comparePassword, hashPassword } from "./auth";

export async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "SM Associate Admin";

  if (!email || !password) {
    console.warn("ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping admin bootstrap.");
    return;
  }
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters.");

  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password), role: "ADMIN", isActive: true }
    });
    console.log("Initial admin created: " + email);
    return;
  }

  const passwordMatches = await comparePassword(password, existing.passwordHash);
  const changed =
    existing.name !== name ||
    existing.role !== "ADMIN" ||
    !existing.isActive ||
    !passwordMatches;

  if (changed) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        role: "ADMIN",
        isActive: true,
        ...(passwordMatches ? {} : { passwordHash: await hashPassword(password) })
      }
    });
    console.log("Admin credentials synchronized: " + email);
  } else {
    console.log("Admin already configured: " + email);
  }
}
