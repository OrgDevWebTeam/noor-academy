import { Router } from "express";
import validate from "../middlewares/validate.js";
import { registerSchema, loginSchema } from "../validations/authValidation.js";
import { registerParent, login } from "../controllers/authController.js";

const router = Router();

router.post("/register", validate(registerSchema), registerParent);
router.post("/login", validate(loginSchema), login);

export default router;
