import jwt from "jsonwebtoken";
import config from "../config/env.js";
import User from "../Models/User.js";

export default async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = header.slice(7);

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const user = await User.findById(payload.userId).select("role status");

  if (!user || user.status !== "active") {
    return res.status(401).json({ message: "Invalid or inactive account" });
  }

  req.user = { _id: user._id, role: user.role };
  next();
}
