import { Request, Response } from 'express';
import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import compression from "compression";
// import swaggerUi from "swagger-ui-express";

import routes from "./routes.js";
// import swaggerSpec from "./docs/swagger.js";
import sanitizeMiddleware from "./shared/middlewares/sanitize.js";
import { errorHandler } from "./shared/middlewares/errorHandler.js";
import { notFoundHandler } from "./shared/middlewares/notFoundHandler.js";
import { globalAppRateLimiter } from "./shared/middlewares/rateLimit.js";

const app = express();
const trustProxy = process.env.TRUST_PROXY?.trim().toLowerCase();

if (trustProxy === "false") {
  app.set("trust proxy", false);
} else if (trustProxy && /^\d+$/.test(trustProxy)) {
  app.set("trust proxy", Number(trustProxy));
} else {
  app.set("trust proxy", 1);
}

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(sanitizeMiddleware);

// app.get("/docs.json", (_req: Request, res: Response) => {
//     res.status(200).json(swaggerSpec);
// });
// app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
//     explorer: true,
//     customSiteTitle: "ModelBridge API Docs",
// }));

app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));
app.use("/api/v1", globalAppRateLimiter, routes);
app.use("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
