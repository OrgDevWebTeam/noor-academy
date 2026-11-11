import { Router } from "express";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import loadFamily from "../middlewares/loadFamily.js";
import validate from "../middlewares/validate.js";
import { createConsentSchema } from "../validations/consentValidation.js";
import { createConsent, listConsents, getConsentStatus } from "../controllers/consentController.js";

const router = Router();

router.use(authenticate, authorize("parent"), loadFamily);

router.post("/", validate(createConsentSchema), createConsent);
router.get("/:childId", listConsents);
router.get("/:childId/status", getConsentStatus);

export default router;
