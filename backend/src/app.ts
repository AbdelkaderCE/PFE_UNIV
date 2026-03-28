import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/routes/auth.routes";
import requestRoutes from "./modules/requests/routes/request.routes";

import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

const app = express();

const configuredOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const localhostDevOriginRegex = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, Postman) and same-origin calls.
      if (!origin) {
        return callback(null, true);
      }

      if (configuredOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (process.env.NODE_ENV !== "production" && localhostDevOriginRegex.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "University API Running",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/requests", requestRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;