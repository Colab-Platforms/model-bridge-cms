import "dotenv/config";

import app from "./app.js";
import { configureServerTimeouts, registerServerLifecycle } from "./utils/serverConfig.js";
// import { syncModelsForProvider } from "./scripts/syncProviderModels.js";

const PORT = process.env.PORT || 5000;

// async function run() {
//   console.log("🚀 Starting Model Bridge backend initialization...");

//   try {
//     await syncModelsForProvider("openai");
//     console.log("✅ All provider models synced successfully!");
//   } catch (error) {
//     console.error("❌ A critical error occurred during initialization:", error);
//   }
// }


// run().catch((err) => {
//   console.error("❌ Fatal crash in main execution block:", err);
// });

// void run().catch((err) => {
//   console.error("Fatal crash in main execution block:", err);
// });

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

configureServerTimeouts(server);
registerServerLifecycle(server);
