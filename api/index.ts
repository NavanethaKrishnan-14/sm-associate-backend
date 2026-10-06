import app from "../src/app";
import { connectDatabase } from "../src/config/db";

let initialized = false;

export default async function handler(req: any, res: any) {
  if (!initialized) {
    await connectDatabase();
    initialized = true;
  }

  return app(req, res);
}
