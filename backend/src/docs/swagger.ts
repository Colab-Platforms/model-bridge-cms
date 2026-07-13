import path from "path";

import swaggerJSDoc from "swagger-jsdoc";

const serverBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "http://localhost:5000";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "ModelBridge Backend API",
      version: "1.0.0",
      description:
        "Production-ready API documentation for frontend integration with ModelBridge.",
    },
    servers: [
      {
        url: serverBaseUrl,
        description: "Configured backend server",
      },
    ],
    tags: [
      { name: "Auth", description: "User authentication and session management" },
      { name: "Models", description: "Public model listing endpoints" },
      { name: "API Keys", description: "User API key management" },
      { name: "Wallets", description: "Wallet and balance management" },
      { name: "Providers", description: "Admin provider management" },
      { name: "Chat Completions", description: "LLM completions and streaming" },
      { name: "Health", description: "Health check endpoints" },
    ],
  },
  apis: [path.resolve(process.cwd(), "src/docs/swagger.annotations.ts")],
});

export default swaggerSpec;
