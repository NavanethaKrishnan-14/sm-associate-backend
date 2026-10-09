import "dotenv/config";
import { clearDemoData, seedDemoData } from "../src/utils/seedDemoData";
import { disconnectDatabase } from "../src/config/db";

async function main() {
  const command = (process.argv[2] || "seed").toLowerCase();

  try {
    if (command === "clear") {
      await clearDemoData();
      console.log("Demo data cleared. Real records and Dashboard Notes were preserved.");
      return;
    }

    if (command !== "seed") {
      throw new Error("Unknown command. Use: npm run seed:demo or npm run seed:demo:clear");
    }

    const result = await seedDemoData();
    console.log("Demo data seeded successfully:", result);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  console.error("Demo data operation failed:", error);
  process.exit(1);
});
