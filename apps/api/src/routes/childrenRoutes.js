import { Router } from "express";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import loadFamily from "../middlewares/loadFamily.js";
import validate from "../middlewares/validate.js";
import { createChildSchema, updateChildSchema } from "../validations/childValidation.js";
import {
  createChild,
  listChildren,
  getChild,
  updateChild,
  archiveChild,
} from "../controllers/childrenController.js";
import { apiLimiter } from "../middlewares/rateLimiter.js";

const router = Router();
router.use(apiLimiter);

router.use(authenticate, authorize("parent"), loadFamily);

router.post("/", validate(createChildSchema), createChild);
router.get("/", listChildren);
router.get("/:id", getChild);
router.patch("/:id", validate(updateChildSchema), updateChild);
router.patch("/:id/archive", archiveChild);

export default router;
