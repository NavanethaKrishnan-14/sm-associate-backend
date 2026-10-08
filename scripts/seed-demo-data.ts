import "dotenv/config";
import { clearDemoData, seedDemoData } from "../src/utils/seedDemoData";
import { disconnectDatabase } from "../src/config/db";

async function main() {
  const command = process.argv[2]?.toLowerCase();

  try {
    if (command === "clear") {
      await clearDemoData();
      console.log("Demo data cleared.");
      return;
    }

    const result = await seedDemoData();
    console.log(result);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  console.error("Demo seed failed:", error);
  process.exit(1);
});
