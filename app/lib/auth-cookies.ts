import "server-only";

/**
 * Compatibility shim — the session implementation moved to `api-server.ts`
 * (JWT access + refresh cookies against the Nest API).
 */
export {
  SESSION_COOKIE,
  ROLE_COOKIE,
  REFRESH_COOKIE,
  getSessionUser,
} from "./api-server";
