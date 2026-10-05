import { prisma } from "../config/db";
import { newLegacyObjectId } from "./legacy";

export async function nextSequence(name: string): Promise<number> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const row = await prisma.sequence.upsert({ where:{name}, create:{name,value:1}, update:{value:{increment:1}} });
      return row.value;
    } catch (error:any) {
      if (error?.code === "P2002") continue;
      throw error;
    }
  }
  throw new Error("Unable to allocate sequence value.");
}
export async function nextId(prefix:string,sequenceName:string):Promise<string>{
  return prefix + "-" + String(await nextSequence(sequenceName)).padStart(5,"0");
}
export function newDatabaseId():string{return newLegacyObjectId();}