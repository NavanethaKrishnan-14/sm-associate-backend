import "dotenv/config";
import { clearDemoData } from "../src/utils/seedDemoData";
import { disconnectDatabase } from "../src/config/db";

async function main() {
  const command = process.argv[2]?.toLowerCase();

  try {
    if (command !== "clear") {
      throw new Error(
        "Demo data seeding is disabled. To remove existing demo records, run: npm run seed:demo:clear"
      );
    }

    await clearDemoData();
    console.log("Demo data cleared. Real records and Dashboard Notes were preserved.");
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  console.error("Demo data operation failed:", error);
  process.exit(1);
});
