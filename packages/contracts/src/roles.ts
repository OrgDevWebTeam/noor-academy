/**
 * Roles and permissions (architecture section 6). Code checks PERMISSIONS, never role names.
 * Owners: Mohammad / Osama. The mapping below is a starting proposal to review.
 */
export const ROLES = ["parent", "teacher", "content_admin", "platform_admin"] as const;
export type Role = (typeof ROLES)[number];

/** Staff roles must sign in with multi-factor authentication. */
export const STAFF_ROLES = ["teacher", "content_admin", "platform_admin"] as const;
export const isStaffRole = (role: Role): boolean =>
  (STAFF_ROLES as readonly string[]).includes(role);

export const PERMISSIONS = [
  "child:create",
  "child:read",
  "child:pin:manage",
  "content:manage",
  "user:manage",
  "assignment:manage",
  "audit:read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// Least privilege: admins manage the platform but cannot read children's data by default.
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  parent: ["child:create", "child:read", "child:pin:manage"],
  teacher: ["child:read"],
  content_admin: ["content:manage"],
  platform_admin: ["user:manage", "assignment:manage", "audit:read"],
};

export const hasPermission = (roles: readonly Role[], permission: Permission): boolean =>
  roles.some((role) => ROLE_PERMISSIONS[role].includes(permission));
