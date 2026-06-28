export type Env = {
  DB: D1Database;
  SITE_PASSWORD_SHA256?: string;
  SESSION_SECRET?: string;
  SITE_SESSION_TTL_SECONDS?: string;
};
