import express from "express";
import helmet from "helmet";
import cors from "cors";
// import rateLimit from "express-rate-limit";
import config from "./config/env.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   limit: 20,
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Routes are mounted here, one step at a time:
// app.use("/api/auth", authLimiter, authRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large" });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid id or value" });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: "Duplicate value" });
  }

  console.error(err);
  res.status(500).json({ message: "Server error" });
});

export default app;
