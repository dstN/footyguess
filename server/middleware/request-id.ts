/**
 * Request ID Middleware
 *
 * Adds a unique request ID to every request for tracing
 * and debugging purposes.
 */

import { defineEventHandler } from "h3";
import { randomUUID } from "crypto";

export default defineEventHandler((event) => {
  // Generate request ID if not present
  const requestId =
    (event.node.req.headers["x-request-id"] as string) || randomUUID();

  // Add to response headers
  event.node.res.setHeader("x-request-id", requestId);
});
