import { Router } from "express";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import validate from "../middlewares/validate.js";
import { createContentSchema, updateContentSchema } from "../validations/contentValidation.js";
import {
  listContent,
  getContent,
  createContent,
  updateContent,
  submitForReview,
  approveContent,
  publishContent,
} from "../controllers/contentController.js";
import { apiLimiter } from "../middlewares/rateLimiter.js";

const router = Router();
router.use(apiLimiter);

const staff = authorize("content_admin", "platform_admin");
const reviewers = authorize("reviewer", "platform_admin");

router.use(authenticate);

router.get("/", listContent);
router.get("/:id", getContent);

router.post("/", staff, validate(createContentSchema), createContent);
router.patch("/:id", staff, validate(updateContentSchema), updateContent);
router.patch("/:id/submit-review", staff, submitForReview);
router.patch("/:id/approve", reviewers, approveContent);
router.patch("/:id/publish", staff, publishContent);

export default router;
