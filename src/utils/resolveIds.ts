import { Types } from "mongoose";

export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && Types.ObjectId.isValid(value);
}

export function objectIdOrUndefined(value: unknown) {
  return isObjectId(value) ? new Types.ObjectId(value) : undefined;
}

export async function resolveCustomerId(value: unknown) {
  const { Customer } = await import("../models/Customer");
  const raw=String(value??"").trim();
  if(!raw) return null;
  if(isObjectId(raw)) return new Types.ObjectId(raw);
  const doc=await Customer.findOne({customerId:raw}).select("_id");
  return doc?doc._id:null;
}

export async function resolveCarId(value: unknown) {
  const { Car } = await import("../models/Car");
  const raw=String(value??"").trim();
  if(!raw) return null;
  if(isObjectId(raw)) return new Types.ObjectId(raw);
  const doc=await Car.findOne({vehicleId:raw}).select("_id");
  return doc?doc._id:null;
}

export async function resolveLoanId(value: unknown) {
  const { Loan } = await import("../models/Loan");
  const raw=String(value??"").trim();
  if(!raw) return null;
  if(isObjectId(raw)) return new Types.ObjectId(raw);
  const doc=await Loan.findOne({loanId:raw}).select("_id");
  return doc?doc._id:null;
}

export async function resolveUserId(value: unknown) {
  const { User } = await import("../models/User");
  const raw=String(value??"").trim();
  if(!raw) return null;
  if(isObjectId(raw)) return new Types.ObjectId(raw);
  const doc=await User.findOne({email:raw.toLowerCase()}).select("_id");
  return doc?doc._id:null;
}
