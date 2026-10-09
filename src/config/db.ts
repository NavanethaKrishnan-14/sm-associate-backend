import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({log:process.env.NODE_ENV==="development"?["error","warn"]:["error"],transactionOptions:{maxWait:5000,timeout:10000}});
if(process.env.NODE_ENV!=="production")globalForPrisma.prisma=prisma;
let connectionCheck:Promise<void>|null=null;
export async function connectDatabase():Promise<void>{
  if(!connectionCheck)connectionCheck=prisma.$connect().then(async()=>{await prisma.$queryRaw`SELECT 1`;}).catch(error=>{connectionCheck=null;throw error;});
  await connectionCheck;
}
export async function disconnectDatabase():Promise<void>{connectionCheck=null;await prisma.$disconnect();}
