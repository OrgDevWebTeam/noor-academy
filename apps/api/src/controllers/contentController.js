import mongoose from "mongoose";
import Competency from "../Models/Competency.js";
import Content from "../Models/Content.js";
import AppError from "../utils/AppError.js";
import { recordAudit } from "../utils/audit.js";
import { listContentQuery } from "../validations/contentValidation.js";

const CAN_SEE_ALL = ["content_admin", "platform_admin", "reviewer"];

async function assertCompetenciesUsable(ids) {
  const unique = [...new Set(ids)];
  const found = await Competency.countDocuments({
    _id: { $in: unique },
    active: true,
  });

  if (found !== unique.length) {
    throw new AppError(400, "One or more competencies do not exist or are inactive");
  }
}

export async function listContent(req, res) {
  const { page, limit, status, ...filters } = listContentQuery.parse(req.query);

  const filter = { ...filters };

  if (CAN_SEE_ALL.includes(req.user.role)) {
    if (status) filter.status = status;
  } else {
    filter.status = "published";
  }

  const [items, total] = await Promise.all([
    Content.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Content.countDocuments(filter),
  ]);

  res.json({
    status: "success",
    total,
    page,
    pages: Math.ceil(total / limit),
    items,
  });
}

export async function getContent(req, res) {
  const content = await Content.findById(req.params.id);

  const visible =
    content && (content.status === "published" || CAN_SEE_ALL.includes(req.user.role));

  if (!visible) {
    throw new AppError(404, "Content not found");
  }

  res.json({ status: "success", content });
}

export async function createContent(req, res) {
  if (req.body.competencies) {
    await assertCompetenciesUsable(req.body.competencies);
  }

  const content = await Content.create({
    ...req.body,
    createdBy: req.user._id,
  });

  res.status(201).json({ status: "success", content });
}

export async function updateContent(req, res) {
  const content = await Content.findById(req.params.id);

  if (!content) {
    throw new AppError(404, "Content not found");
  }

  if (content.status !== "draft") {
    throw new AppError(409, "Only draft content can be updated");
  }

  if (req.body.competencies) {
    await assertCompetenciesUsable(req.body.competencies);
  }

  content.set(req.body);
  await content.save();

  res.json({ status: "success", content });
}

export async function submitForReview(req, res) {
  const content = await Content.findById(req.params.id);

  if (!content) {
    throw new AppError(404, "Content not found");
  }

  if (content.status !== "draft") {
    throw new AppError(409, "Only draft content can be submitted for review");
  }

  content.status = "in_review";
  content.reviewRequired = true;
  await content.save();

  res.json({ status: "success", content });
}

export async function approveContent(req, res) {
  const content = await Content.findById(req.params.id);

  if (!content) {
    throw new AppError(404, "Content not found");
  }

  if (content.status !== "in_review") {
    throw new AppError(409, "Only content that is in review can be approved");
  }

  if (content.createdBy.equals(req.user._id)) {
    try {
      await recordAudit({
        actor: req.user,
        action: "access.denied",
        target: { type: "Content", id: content._id },
        result: "denied",
        meta: { reason: "Self-approval" },
      });
    } catch (error) {
      console.error("Failed to record audit event:", error.message);
    }

    throw new AppError(403, "You cannot approve content you created");
  }

  content.reviewedBy = req.user._id;
  content.approvedAt = new Date();
  await content.save();

  res.json({ status: "success", content });
}

export async function publishContent(req, res) {
  const session = await mongoose.startSession();
  let content;

  try {
    await session.withTransaction(async () => {
      content = await Content.findById(req.params.id).session(session);

      if (!content) {
        throw new AppError(404, "Content not found");
      }

      if (!["draft", "in_review"].includes(content.status)) {
        throw new AppError(409, "Only draft or in-review content can be published");
      }

      if (content.competencies.length === 0) {
        throw new AppError(409, "Content needs at least one competency before publishing");
      }

      if (content.reviewRequired && (!content.reviewedBy || !content.approvedAt)) {
        throw new AppError(409, "Content must be approved by a reviewer before publishing");
      }

      content.status = "published";
      await content.save({ session });

      await recordAudit({
        actor: req.user,
        action: "content.published",
        target: { type: "Content", id: content._id },
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  res.json({ status: "success", content });
}
