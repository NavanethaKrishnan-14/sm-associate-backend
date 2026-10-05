import "dotenv/config";
import app from "./app";
import { connectDatabase } from "./config/db";
import { bootstrapAdmin } from "./utils/bootstrapAdmin";

const PORT = Number(process.env.PORT ?? 5000);
const HOST = process.env.HOST ?? "0.0.0.0";

async function start() {
  await connectDatabase();
  await bootstrapAdmin();

  app.listen(PORT, HOST, () => {
    console.log(`SM Associate API running on http://${HOST}:${PORT}`);
    console.log(`LAN API base: http://<YOUR-PC-LAN-IP>:${PORT}/api/v1`);
  });
}

start().catch(error => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
