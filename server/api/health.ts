import { defineEventHandler } from "h3";
import db from "../db/connection";

export default defineEventHandler(async (event) => {
  try {
    // Check DB connection
    const result = db.prepare("SELECT 1 AS ok").get() as { ok: number };

    if (result?.ok !== 1) {
      throw new Error("Database check failed");
    }

    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: "ok",
      },
    };
  } catch (error) {
    // Return 503 Service Unavailable if health check fails
    event.node.res.statusCode = 503;
    return {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: "failed",
      },
    };
  }
});
