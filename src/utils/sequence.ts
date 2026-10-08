import { prisma } from "../config/db";

export async function nextSequence(name: string): Promise<number> {
  const counter = await prisma.counter.upsert({ where: { name }, create: { name, value: 1 }, update: { value: { increment: 1 } } });
  return counter.value;
}

export async function nextId(prefix: string, sequenceName: string): Promise<string> {
  const value = await nextSequence(sequenceName);
  return prefix + "-" + String(value).padStart(5, "0");
}
