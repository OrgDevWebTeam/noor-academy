import mongoose from "mongoose";
import dns from "node:dns";
import app from "./app.js";

process.on("uncaughtException", (err) => {
  if (err) {
    console.log(err.name, err.message);
  } else {
    console.log(err);
  }
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  process.exit(1);
});

if (!process.env.DATABASE || !process.env.DATABASE_PASSWORD) {
  throw new Error("Missing database environment variables");
}

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD,
);

dns.setServers(["8.8.8.8", "1.1.1.1"]);
mongoose.connect(DB).then(() => console.log("CONNECTED TO DB ✅"));

const port = process.env.PORT || 3000;
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
