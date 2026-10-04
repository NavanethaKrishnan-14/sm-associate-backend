import { Schema, model, InferSchemaType } from "mongoose";

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["ADMIN", "STAFF"], default: "STAFF" },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);
