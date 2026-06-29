import "dotenv/config";

import app from "./app.js";
import { startWorkers } from "./queues/index.js";
import { configureServerTimeouts, registerServerLifecycle } from "./utils/serverConfig.js";

const PORT = process.env.PORT || 5000;

async function bootstrap(): Promise<void> {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  configureServerTimeouts(server);
  registerServerLifecycle(server);

  await startWorkers();
}

bootstrap().catch((err: unknown) => {
  console.error("❌ Fatal crash during server startup:", err);
  process.exit(1);
});
