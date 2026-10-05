export function toLegacy<T>(value:T):T{
 if(value===null||value===undefined||value instanceof Date)return value;
 if(Array.isArray(value))return value.map(toLegacy) as T;
 if(typeof value==="object"){
  const result:Record<string,unknown>={};
  for(const [key,item] of Object.entries(value as Record<string,unknown>)){
   if(item===undefined)continue;
   result[key==="id"?"_id":key]=toLegacy(item);
  }
  return result as T;
 }
 return value;
}
export function newLegacyObjectId():string{
 const bytes=new Uint8Array(12);
 for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
 return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}
export function renameRelations<T extends Record<string, any>>(value:T,mappings:Record<string,string>):T{
 const result={...value} as Record<string,any>;
 for(const [from,to] of Object.entries(mappings)){if(Object.prototype.hasOwnProperty.call(result,from)){result[to]=result[from];delete result[from];}}
 return result as T;
}
