import Competency from "../Models/Competency.js";
import Content from "../Models/Content.js";
import AppError from "../utils/AppError.js";
import { listCompetenciesQuery } from "../validations/curriculumValidation.js";

export async function listCompetencies(req, res) {
  const { domain, active, page, limit } = listCompetenciesQuery.parse(req.query);

  const filter = {};
  if (domain) filter.domain = domain;
  if (active !== undefined) filter.active = active;

  const [competencies, total] = await Promise.all([
    Competency.find(filter)
      .sort({ domain: 1, code: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Competency.countDocuments(filter),
  ]);

  res.json({
    status: "success",
    total,
    page,
    pages: Math.ceil(total / limit),
    competencies,
  });
}

export async function getCompetency(req, res) {
  const competency = await Competency.findById(req.params.id);

  if (!competency) {
    throw new AppError(404, "Competency not found");
  }

  res.json({ status: "success", competency });
}

export async function createCompetency(req, res) {
  const competency = await Competency.create(req.body);

  res.status(201).json({ status: "success", competency });
}

export async function updateCompetency(req, res) {
  const competency = await Competency.findById(req.params.id);

  if (!competency) {
    throw new AppError(404, "Competency not found");
  }

  const { domain, name } = req.body;

  if (domain !== undefined && domain !== competency.domain) {
    const inUse = await Content.exists({ competencies: competency._id });

    if (inUse) {
      throw new AppError(
        409,
        "Cannot change the domain because content already uses this competency",
      );
    }

    competency.domain = domain;
  }

  if (name !== undefined) {
    competency.name = name;
  }

  await competency.save();

  res.json({ status: "success", competency });
}

export async function updateCompetencyStatus(req, res) {
  const competency = await Competency.findById(req.params.id);

  if (!competency) {
    throw new AppError(404, "Competency not found");
  }

  const { active } = req.body;

  if (active === false) {
    const usedByPublished = await Content.exists({
      competencies: competency._id,
      status: "published",
    });

    if (usedByPublished) {
      throw new AppError(409, "Cannot deactivate a competency used by published content");
    }
  }

  competency.active = active;
  await competency.save();

  res.json({
    status: "success",
    competency,
  });
}
