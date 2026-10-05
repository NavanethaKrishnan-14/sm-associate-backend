import { prisma } from "../config/db";
import { comparePassword, hashPassword } from "./auth";
import { newDatabaseId } from "./sequence";

export async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "SM Associate Admin";
  if (!email || !password) { console.warn("ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping admin bootstrap."); return; }
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({ data:{id:newDatabaseId(),name,email,passwordHash:await hashPassword(password),role:"ADMIN",isActive:true} });
    console.log("Initial admin created: " + email);
    return;
  }

  const data:any = {};
  if (existing.name !== name) data.name=name;
  if (existing.role !== "ADMIN") data.role="ADMIN";
  if (!existing.isActive) data.isActive=true;
  if (!(await comparePassword(password, existing.passwordHash))) data.passwordHash=await hashPassword(password);
  if (Object.keys(data).length) {
    await prisma.user.update({where:{id:existing.id},data});
    console.log("Admin credentials synchronized: " + email);
  } else console.log("Admin already configured: " + email);
}