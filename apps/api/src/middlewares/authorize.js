import { recordAudit } from "../utils/audit.js";

export default function authorize(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      try {
        await recordAudit({
          actor: req.user,
          action: "access.denied",
          result: "denied",
          meta: { reason: `${req.method} ${req.baseUrl}`.slice(0, 200) },
        });
      } catch (error) {
        console.error("Failed to record audit event:", error.message);
      }

      return res
        .status(403)
        .json({ status: "fail", message: "You do not have permission to perform this action" });
    }

    next();
  };
}
