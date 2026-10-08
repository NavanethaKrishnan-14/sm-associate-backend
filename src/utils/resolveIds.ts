import { prisma } from "../config/db";

function raw(value: unknown): string | null { const v = String(value ?? "").trim(); return v || null; }

export async function resolveCustomerId(value: unknown): Promise<string | null> { const v=raw(value); if(!v)return null; const a=await prisma.customer.findUnique({where:{customerId:v},select:{id:true}}); if(a)return a.id; const b=await prisma.customer.findUnique({where:{id:v},select:{id:true}}); return b?.id ?? null; }
export async function resolveCarId(value: unknown): Promise<string | null> { const v=raw(value); if(!v)return null; const a=await prisma.car.findUnique({where:{vehicleId:v},select:{id:true}}); if(a)return a.id; const b=await prisma.car.findUnique({where:{id:v},select:{id:true}}); return b?.id ?? null; }
export async function resolveLoanId(value: unknown): Promise<string | null> { const v=raw(value); if(!v)return null; const a=await prisma.loan.findUnique({where:{loanId:v},select:{id:true}}); if(a)return a.id; const b=await prisma.loan.findUnique({where:{id:v},select:{id:true}}); return b?.id ?? null; }
export async function resolveEnquiryId(value: unknown): Promise<string | null> { const v=raw(value); if(!v)return null; const a=await prisma.financeEnquiry.findUnique({where:{enquiryId:v},select:{id:true}}); if(a)return a.id; const b=await prisma.financeEnquiry.findUnique({where:{id:v},select:{id:true}}); return b?.id ?? null; }
export async function resolveUserId(value: unknown): Promise<string | null> { const v=raw(value); if(!v)return null; const a=await prisma.user.findUnique({where:{email:v.toLowerCase()},select:{id:true}}); if(a)return a.id; const b=await prisma.user.findUnique({where:{id:v},select:{id:true}}); return b?.id ?? null; }
