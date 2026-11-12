import { z } from "zod";
import { text } from "./helpers.js";

export const registerSchema = z.object({
  name: text("Name")
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  email: text("Email")
    .trim()
    .toLowerCase()
    .email("Email is not valid")
    .max(254, "Email is too long"),
  password: text("Password")
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
});

export const loginSchema = z.object({
  email: text("Email").trim().toLowerCase().email("Email is not valid"),
  password: text("Password").min(1, "Password is required").max(72),
});
