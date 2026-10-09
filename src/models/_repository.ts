import { prisma } from "../config/db";

type ModelName = "user"|"customer"|"car"|"carExpense"|"carSale"|"financeService"|"financeEnquiry"|"loan"|"loanFollowUp";
const relationMap:any = {
  user:{assignedLoans:"assignedLoans",enquiries:"enquiries",followUps:"followUps"},
  customer:{carsSold:"carsSold",carPurchases:"carPurchases",loans:"loans",enquiries:"enquiries"},
  car:{seller:"seller",sellerId:"seller",expenses:"expenses",sale:"sale"},
  carExpense:{car:"car"},
  carSale:{car:"car",carId:"car",buyer:"buyer",buyerId:"buyer"},
  financeService:{enquiries:"enquiries"},
  financeEnquiry:{customer:"customer",customerId:"customer",service:"service",serviceCode:"service",assignee:"assignee",assignedTo:"assignee"},
  loan:{customer:"customer",customerId:"customer",assignee:"assignee",assignedTo:"assignee",followUps:"followUps"},
  loanFollowUp:{loan:"loan",loanId:"loan",creator:"creator",createdBy:"creator"}
};
const scalarMap:any = {
  user:["id","name","email","passwordHash","role","isActive","createdAt","updatedAt"],
  customer:["id","customerId","name","mobile","alternateMobile","email","address","city","occupation","pan","aadhaarLast4","notes","documents","createdAt","updatedAt"],
  car:["id","vehicleId","sellerId","registrationNumber","make","model","year","ownerNumber","km","fuel","purchasePrice","status","purchaseDate","notes","createdAt","updatedAt"],
  carExpense:["id","carId","category","amount","description","date","createdAt","updatedAt"],
  carSale:["id","saleId","carId","buyerId","sellingPrice","sellingExpenses","totalInvestment","profit","saleDate","notes","documents","createdAt","updatedAt"],
  financeService:["id","code","name","category","parentCode","description","active","sortOrder","createdAt","updatedAt"],
  financeEnquiry:["id","enquiryId","customerId","serviceCode","financeCompany","requiredAmount","status","followUpDate","notes","assignedTo","createdAt","updatedAt"],
  loan:["id","loanId","customerId","loanType","requiredAmount","approvedAmount","financeCompany","status","applicationDate","expectedDisbursementDate","disbursementDate","commission","rejectionReason","notes","assignedTo","createdAt","updatedAt"],
  loanFollowUp:["id","loanId","followUpDate","nextFollowUpDate","note","status","createdBy","createdAt","updatedAt"]
};
const delegate=(name:ModelName)=>(prisma as any)[name];
function getPath(obj:any,path:string){ return path.split(".").reduce((v,k)=>v==null?undefined:v[k],obj); }
function setPath(obj:any,path:string,value:any){ const parts=path.split("."); let cur=obj; for(let i=0;i<parts.length-1;i++){if(!cur[parts[i]]||typeof cur[parts[i]]!=="object")cur[parts[i]]={};cur=cur[parts[i]];} cur[parts[parts.length-1]]=value; }
function matchValue(value:any,cond:any):boolean{
  if(cond&&typeof cond==="object"&&!Array.isArray(cond)){
    if("$in" in cond)return cond.$in.some((x:any)=>String(value)===String(x));
    if("$nin" in cond)return !cond.$nin.some((x:any)=>String(value)===String(x));
    if("$gte" in cond&&!(value>=cond.$gte))return false;
    if("$gt" in cond&&!(value>cond.$gt))return false;
    if("$lte" in cond&&!(value<=cond.$lte))return false;
    if("$lt" in cond&&!(value<cond.$lt))return false;
    if("$regex" in cond){const re=new RegExp(String(cond.$regex),String(cond.$options||""));if(!re.test(String(value??"")))return false;}
    return true;
  }
  if(value instanceof Date||cond instanceof Date)return new Date(value).getTime()===new Date(cond).getTime();
  return String(value??"")===String(cond??"");
}
function matches(obj:any,filter:any):boolean{
  if(!filter||!Object.keys(filter).length)return true;
  if(filter.$or&&!filter.$or.some((x:any)=>matches(obj,x)))return false;
  if(filter.$and&&!filter.$and.every((x:any)=>matches(obj,x)))return false;
  for(const [key,cond] of Object.entries(filter)){if(key==="$or"||key==="$and")continue;if(!matchValue(getPath(obj,key),cond))return false;}
  return true;
}
function cleanData(data:any,model:ModelName){
  const allowed=new Set(scalarMap[model]); const out:any={};
  for(const [k,v] of Object.entries(data||{})){
    if(k==="_id"&&allowed.has("id"))out.id=v;
    else if(allowed.has(k)){const value:any=v;out[k]=value&&typeof value==="object"&&"_id" in value?value._id:value;}
  }
  return out;
}
function alias(record:any,model?:ModelName):any{
  if(!record)return record;if(Array.isArray(record))return record.map(x=>alias(x,model));
  const out:any={...record};if(out.id!==undefined)out._id=out.id;
  const reverse:any={car:{seller:"sellerId"},carExpense:{car:"carId"},carSale:{car:"carId",buyer:"buyerId"},financeEnquiry:{customer:"customerId",service:"serviceCode",assignee:"assignedTo"},loan:{customer:"customerId",assignee:"assignedTo"},loanFollowUp:{loan:"loanId",creator:"createdBy"},customer:{},user:{},financeService:{}};
  for(const [relation,field] of Object.entries(reverse[model||""]||{})){if(out[relation]!==undefined)out[String(field)]=out[relation];}
  return out;
}
function buildInclude(model:ModelName,pops:any[]):any{
  const include:any={};
  for(const p of pops){
    const requested=typeof p==="string"?p:p?.path;if(!requested)continue;
    const rel=relationMap[model]?.[requested];if(!rel)continue;
    const nested=typeof p==="object"&&p.populate?(Array.isArray(p.populate)?p.populate:[p.populate]):[];
    const fields=typeof p==="object"&&p.select?String(p.select).split(/\s+/).filter(Boolean):[];
    const select:any=fields.length?Object.fromEntries(fields.map((f:string)=>[f.replace(/^[-+]/,""),!f.startsWith("-")])):undefined;
    if(nested.length)include[rel]={include:buildInclude(relationModel(model,requested),nested),...(select?{select}:{})};
    else include[rel]=select?{select}:true;
  }
  return include;
}
function relationModel(model:ModelName,path:string):ModelName{
  const map:any={
    customer:{carsSold:"car",carPurchases:"carSale",loans:"loan",enquiries:"financeEnquiry"},
    car:{seller:"customer",expenses:"carExpense",sale:"carSale"},carExpense:{car:"car"},carSale:{car:"car",buyer:"customer"},
    financeEnquiry:{customer:"customer",service:"financeService",assignee:"user"},loan:{customer:"customer",assignee:"user",followUps:"loanFollowUp"},
    loanFollowUp:{loan:"loan",creator:"user"},user:{assignedLoans:"loan",enquiries:"financeEnquiry",followUps:"loanFollowUp"},financeService:{enquiries:"financeEnquiry"}
  };
  return map[model]?.[path]||model;
}
class Query<T=any>{
  private pops:any[]=[];private fields?:string;private sortSpec:any;
  constructor(private model:ModelName,private op:"find"|"findOne"|"findById",private arg:any){}
  select(fields:string){this.fields=fields;return this;} sort(spec:any){this.sortSpec=spec;return this;}
  populate(spec:any,select?:string){this.pops.push(typeof spec==="string"?{path:spec,select}:spec);return this;}
  async exec():Promise<T>{
    const d=delegate(this.model),include=buildInclude(this.model,this.pops);
    const query=this.op==="findById"?{where:{id:String(this.arg)},...(Object.keys(include).length?{include}:{})}:{...(Object.keys(include).length?{include}:{})};
    const rows:any[]=await d.findMany(query);
    const filtered=rows.map((x:any)=>alias(x,this.model)).filter((r:any)=>this.op==="findById"||matches(r,this.arg));
    if(this.op==="findOne")filtered.splice(1);
    if(this.sortSpec)filtered.sort((a,b)=>{for(const [k,dir] of Object.entries(this.sortSpec)){const av=getPath(a,k),bv=getPath(b,k);if(av===bv)continue;return (av>bv?1:-1)*(Number(dir)>0?1:-1);}return 0;});
    const projected=filtered.map(r=>this.project(r));
    return (this.op==="find"?projected:projected[0]??null) as T;
  }
  private project(r:any){if(!this.fields)return r;const tokens=this.fields.split(/\s+/).filter(Boolean);const negative=tokens[0]?.startsWith("-");if(negative){const o={...r};for(const t of tokens)o[t.replace(/^-/,"")]=undefined;return o;}const o:any={_id:r._id,id:r.id};for(const t of tokens){const k=t.replace(/^\+/,"");if(k in r)o[k]=r[k];}return o;}
  then(onfulfilled?:any,onrejected?:any){return this.exec().then(onfulfilled,onrejected);}
}
class ModelInstance{
  constructor(private model:ModelName,public data:any){return new Proxy(this,{get:(target:any,key:PropertyKey,receiver:any)=>{if(key in target)return Reflect.get(target,key,receiver);return target.data[key as any];},set:(target:any,key:PropertyKey,value:any)=>{if(key in target){(target as any)[key]=value;return true;}target.data[key as any]=value;return true;}}) as any;}
  get _id(){return this.data._id??this.data.id;} set _id(v:any){this.data._id=v;this.data.id=v;}
  async save(){const id=String(this.data._id??this.data.id),update:any={};for(const k of scalarMap[this.model]){if(k==="id"||k==="createdAt"||k==="updatedAt")continue;if(this.data[k]!==undefined)update[k]=this.data[k];}const r=await delegate(this.model).update({where:{id},data:cleanData(update,this.model)});Object.assign(this.data,alias(r,this.model));return this;}
  async deleteOne(){return delegate(this.model).delete({where:{id:String(this.data._id??this.data.id)}});} markModified(_path:string){} toObject(){return {...this.data};}
  async populate(spec:any,select?:string){const q=new Query(this.model,"findById",this._id).populate(spec,select);const r=await q.exec();if(r)Object.assign(this.data,r);return this;}
}
export function makeModel(model:ModelName){
  const d=delegate(model);
  return class PrismaModel{
    static find(filter:any={}){return new Query(model,"find",filter);} static findOne(filter:any={}){return new Query(model,"findOne",filter);} static findById(id:any){return new Query(model,"findById",id);}
    static async create(data:any){if(Array.isArray(data))return Promise.all(data.map((item:any)=>this.create(item)));const r=await d.create({data:cleanData(data,model)});return new ModelInstance(model,alias(r,model)) as any;}
    static async findByIdAndUpdate(id:any,update:any,_opts:any={}){
      const base=await d.findUnique({where:{id:String(id)}});if(!base)return null;const next:any={...base},set=update?.$set||update||{};
      for(const [k,v] of Object.entries(set)){if(k.includes(".")){const root=k.split(".")[0];next[root]=next[root]&&typeof next[root]==="object"?{...next[root]}:{};setPath(next,k,v);}else next[k]=v;}
      const r=await d.update({where:{id:String(id)},data:cleanData(next,model)});return new ModelInstance(model,alias(r,model)) as any;
    }
    static async countDocuments(filter:any={}){const rows=await d.findMany();return rows.map((x:any)=>alias(x,model)).filter((r:any)=>matches(r,filter)).length;}
    static async deleteMany(filter:any={}){const rows=await d.findMany();const ids=rows.map((x:any)=>alias(x,model)).filter((r:any)=>matches(r,filter)).map((r:any)=>r.id);if(ids.length)await d.deleteMany({where:{id:{in:ids}}});return {deletedCount:ids.length};}
    static async exists(filter:any={}){return (await this.countDocuments(filter))>0;}
    static async bulkWrite(ops:any[]){
      for(const op of ops){const x=op.updateOne;if(!x)continue;const uniqueField=model==="financeService"?"code":model==="customer"?"customerId":model==="car"?"vehicleId":model==="loan"?"loanId":model==="financeEnquiry"?"enquiryId":"id";
        const uniqueValue=x.filter?.[uniqueField];if(uniqueValue===undefined)continue;const existing=await d.findUnique({where:{[uniqueField]:uniqueValue}});
        if(existing){if(x.update?.$set)await d.update({where:{id:existing.id},data:cleanData(x.update.$set,model)});}
        else if(x.upsert)await d.create({data:cleanData(x.update?.$setOnInsert||x.update?.$set||x.filter,model)});
      }return {ok:1};
    }
    static async aggregate(pipeline:any[]){
      let rows=await d.findMany();
      for(const stage of pipeline){if(stage.$match)rows=rows.map((x:any)=>alias(x,model)).filter((r:any)=>matches(r,stage.$match));
        if(stage.$group){const idExpr=stage.$group._id,groups=new Map<string,any>();
          for(const row of rows.map((x:any)=>alias(x,model))){const key=idExpr===null?null:(typeof idExpr==="string"?getPath(row,idExpr.replace(/^\$/,"")):null),ks=String(key);let g=groups.get(ks);
            if(!g){g={_id:key};for(const [k,v] of Object.entries(stage.$group)){if(k!=="_id")g[k]=0;}groups.set(ks,g);}
            for(const [k,v] of Object.entries(stage.$group)){if(k==="_id")continue;const sum:any=(v as any).$sum;if(typeof sum==="number")g[k]+=sum;else if(typeof sum==="string")g[k]+=Number(getPath(row,sum.replace(/^\$/,""))||0);}
          }rows=[...groups.values()];}
      }return rows;
    }
  };
}
