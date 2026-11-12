import mongoose from "mongoose";
import dns from "node:dns";
import app from "./app.js";
import config from "./config/env.js";

process.on("uncaughtException", (err) => {
  if (err) {
    console.log(err.name, err.message);
  } else {
    console.log(err);
  }
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  process.exit(1);
});

dns.setServers(["8.8.8.8", "1.1.1.1"]);
mongoose.connect(config.databaseUrl).then(() => console.log("CONNECTED TO DB ✅"));

const port = config.port;
const server = app.listen(port, () => {
  console.log(`App running on port: ${port}...`);
});

process.on("unhandledRejection", (err) => {
  if (err instanceof Error) {
    console.log(err.name, err.message);
  } else {
    console.log(err);
  }
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  server.close(() => {
    process.exit(1);
  });
});
