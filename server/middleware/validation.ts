/**
 * Input Validation Middleware
 *
 * Validates incoming request bodies/queries and rejects invalid requests
 * before they reach route handlers. Uses Valibot schemas for validation.
 */

import { defineEventHandler, readBody, getQuery } from "h3";
import { errorResponse } from "../utils/response.ts";
import { logError } from "../utils/logger.ts";

export interface ValidationRule {
  /** Route path to validate */
  route: string;
  /** HTTP methods to validate */
  methods: ("GET" | "POST" | "PUT" | "DELETE")[];
  /** Validation function that returns true if valid, error message if invalid */
  validate: (data: any) => true | string;
}

const VALIDATION_RULES: ValidationRule[] = [
  {
    route: "/api/searchPlayers",
    methods: ["GET"],
    validate: (data) => {
      if (!data.q || typeof data.q !== "string") {
        return "Query parameter 'q' is required and must be a string";
      }
      if (data.q.length < 2) {
        return "Query 'q' must be at least 2 characters";
      }
      if (data.q.length > 64) {
        return "Query 'q' must not exceed 64 characters";
      }
      return true;
    },
  },
  {
    route: "/api/guess",
    methods: ["POST"],
    validate: (data) => {
      if (!data.roundId || typeof data.roundId !== "string") {
        return "Field 'roundId' is required and must be a string";
      }
      if (!data.token || typeof data.token !== "string") {
        return "Field 'token' is required and must be a string";
      }
      if (!data.guess || typeof data.guess !== "string") {
        return "Field 'guess' is required and must be a string";
      }
      if (data.guess.length < 1) {
        return "Guess must not be empty";
      }
      if (data.guess.length > 128) {
        return "Guess must not exceed 128 characters";
      }
      return true;
    },
  },
  {
    route: "/api/useClue",
    methods: ["POST"],
    validate: (data) => {
      if (!data.roundId || typeof data.roundId !== "string") {
        return "Field 'roundId' is required and must be a string";
      }
      if (!data.token || typeof data.token !== "string") {
        return "Field 'token' is required and must be a string";
      }
      return true;
    },
  },
  {
    route: "/api/requestPlayer",
    methods: ["POST"],
    validate: (data) => {
      if (!data.playerName || typeof data.playerName !== "string") {
        return "Field 'playerName' is required and must be a string";
      }
      if (data.playerName.length < 1) {
        return "Player name must not be empty";
      }
      if (data.playerName.length > 256) {
        return "Player name must not exceed 256 characters";
      }
      return true;
    },
  },
  {
    route: "/api/sessionStats",
    methods: ["POST"],
    validate: (data) => {
      if (!data.sessionId || typeof data.sessionId !== "string") {
        return "Field 'sessionId' is required and must be a string";
      }
      return true;
    },
  },
];

export default defineEventHandler(async (event) => {
  const method = event.node.req.method || "GET";
  const url = event.node.req.url || "";
  const path = url.split("?")[0];

  // Find matching validation rule
  const rule = VALIDATION_RULES.find(
    (r) => path === r.route && r.methods.includes(method as any),
  );

  if (!rule) {
    // No validation rule for this route
    return;
  }

  try {
    let data: any;

    // Get data based on method
    if (method === "GET") {
      data = getQuery(event);
    } else {
      // POST, PUT, DELETE
      try {
        data = await readBody(event);
      } catch {
        return errorResponse(
          400,
          "Invalid request body - not valid JSON",
          event,
        );
      }
    }

    // Validate data
    const validationResult = rule.validate(data);

    if (validationResult !== true) {
      return errorResponse(
        400,
        `Validation error: ${validationResult}`,
        event,
        { received: typeof data === "object" ? Object.keys(data) : data },
      );
    }
  } catch (error) {
    logError("Validation middleware error", error);
    return errorResponse(
      500,
      "Validation failed",
      event,
      { error: error instanceof Error ? error.message : "Unknown error" },
    );
  }
});
