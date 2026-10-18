export const USER_ROLES = ["parent", "teacher", "accountant", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_HOME: Record<UserRole, string> = {
  parent: "/parent",
  teacher: "/teacher",
  accountant: "/accountant",
  admin: "/admin",
};
