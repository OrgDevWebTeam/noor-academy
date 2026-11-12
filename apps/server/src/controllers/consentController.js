import mongoose from "mongoose";
import Child from "../Models/Child.js";
import ConsentRecord from "../Models/ConsentRecord.js";
import AppError from "../utils/AppError.js";
import { recordAudit } from "../utils/audit.js";

export async function createConsent(req, res) {
  const { childId, status, policyVersion } = req.body;

  const session = await mongoose.startSession();
  let consent;
  let child;

  try {
    await session.withTransaction(async () => {
      child = await Child.findOwned(childId, req.family._id)
        .where("status")
        .ne("archived")
        .session(session);

      if (!child) {
        throw new AppError(404, "Child not found");
      }

      const requiredState = status === "granted" ? "pending_consent" : "active";
      if (child.status !== requiredState) {
        throw new AppError(
          409,
          status === "granted"
            ? "Consent is already granted for this child"
            : "There is no active consent to withdraw",
        );
      }

      [consent] = await ConsentRecord.create(
        [
          {
            guardianId: req.user._id,
            childId: child._id,
            familyId: req.family._id,
            status,
            policyVersion,
            method: "web_form",
          },
        ],
        { session },
      );

      child.status = status === "granted" ? "active" : "pending_consent";
      await child.save({ session });

      await recordAudit({
        actor: req.user,
        action: `consent.${status}`,
        target: { type: "Child", id: child._id },
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  res.status(201).json({
    status: "success",
    consent,
    childStatus: child.status,
  });
}

export async function listConsents(req, res) {
  const child = await Child.findOwned(req.params.childId, req.family._id);

  if (!child) {
    throw new AppError(404, "Child not found");
  }

  const consents = await ConsentRecord.find({
    childId: child._id,
    familyId: req.family._id,
  }).sort({ createdAt: -1, _id: -1 });

  res.json({ status: "success", count: consents.length, consents });
}

export async function getConsentStatus(req, res) {
  const child = await Child.findOwned(req.params.childId, req.family._id);

  if (!child) {
    throw new AppError(404, "Child not found");
  }

  const latest = await ConsentRecord.findOne({
    childId: child._id,
    familyId: req.family._id,
  }).sort({ createdAt: -1, _id: -1 });

  res.json({
    status: "success",
    childId: child._id,
    childStatus: child.status,
    hasActiveConsent: latest?.status === "granted",
  });
}
