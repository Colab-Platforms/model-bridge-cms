import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      // Manual smoke script (run via `npx tsx`), not a Vitest suite — see its header comment.
      "src/queues/queue.test.ts",
    ],
  },
});
