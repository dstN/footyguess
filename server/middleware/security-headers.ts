import { defineEventHandler, setHeaders } from "h3";

/**
 * Security headers middleware
 * Adds recommended security headers to all responses
 */
export default defineEventHandler((event) => {
  // Skip for health check (no need for security headers on internal endpoint)
  if (event.path === "/api/health") return;

  setHeaders(event, {
    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",
    // Prevent clickjacking
    "X-Frame-Options": "DENY",
    // Enable XSS filter in older browsers
    "X-XSS-Protection": "1; mode=block",
    // Control referrer information
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Restrict browser features
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
});
