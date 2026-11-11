import { Router } from "express";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import validate from "../middlewares/validate.js";
import {
  createCompetencySchema,
  updateCompetencySchema,
  competencyStatusSchema,
} from "../validations/curriculumValidation.js";
import {
  listCompetencies,
  getCompetency,
  createCompetency,
  updateCompetency,
  updateCompetencyStatus,
} from "../controllers/curriculumController.js";

const router = Router();

const staff = authorize("content_admin", "platform_admin");

router.use(authenticate);

router.get("/competencies", listCompetencies);
router.get("/competencies/:id", getCompetency);

router.post("/competencies", staff, validate(createCompetencySchema), createCompetency);
router.patch("/competencies/:id", staff, validate(updateCompetencySchema), updateCompetency);
router.patch(
  "/competencies/:id/status",
  staff,
  validate(competencyStatusSchema),
  updateCompetencyStatus,
);

export default router;
