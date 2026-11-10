import jwt from "jsonwebtoken";
import config from "../config/env.js";

export function signToken(user) {
  return jwt.sign({ userId: user._id }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.jwtExpiresIn,
  });
}
