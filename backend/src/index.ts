import app from "./app.js";
import { configureServerTimeouts, registerServerLifecycle } from "./utils/serverConfig.js";

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

configureServerTimeouts(server);
registerServerLifecycle(server);
