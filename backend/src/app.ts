import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import helmet from "helmet";
import compression from "compression";

import routes from "./routes.js";
import sanitizeMiddleware from "./shared/middlewares/sanitize.js";
import { errorHandler } from "./shared/middlewares/errorHandler.js";
import { notFoundHandler } from "./shared/middlewares/notFoundHandler.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(sanitizeMiddleware);

app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));
app.use("/api/v0", routes);
app.use("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;