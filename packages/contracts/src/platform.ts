/** Current public API version prefix (architecture section 8). */
export const API_VERSION = "v1" as const;

/** Deployment environments (architecture 15.1). Only production holds real family data. */
export const APP_ENVS = ["local", "development", "staging", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];
