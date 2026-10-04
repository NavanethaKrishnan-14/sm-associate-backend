import "dotenv/config";
import app from "./app";
import { connectDatabase } from "./config/db";
const PORT=Number(process.env.PORT??5000);
async function start(){await connectDatabase();app.listen(PORT,()=>console.log(`SM Associate API running on http://localhost:${PORT}`));}
start().catch(error=>{console.error("Server startup failed:",error);process.exit(1);});