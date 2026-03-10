/**
 * Global runtime configuration.
 *
 * NEXT_PUBLIC_DEBUG allows the debug panel to be enabled in production
 * (useful when testing inside an LMS where NODE_ENV !== development).
 */
export const isDebugEnabled = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG === "true";

/**
 * SCORM runtime version used by the course shell.
 *
 * This is intentionally developer-configured rather than auto-detected.
 * The package manifest must match this value (1.2 or 2004).
 */
export const SCORM_VERSION: "1.2" | "2004" = "2004";
