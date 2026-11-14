import Family from "../Models/Family.js";

export default async function loadFamily(req, res, next) {
  const family = await Family.findOne({
    parentId: req.user._id,
    status: "active",
  });

  if (!family) {
    return res.status(403).json({ status: "fail", message: "No active family for this account" });
  }

  req.family = family;
  next();
}
