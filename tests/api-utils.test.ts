import { describe, it, expect } from "vitest";
import * as v from "valibot";
import { validateRequest, ApiErrorCode } from "../server/utils/api";

describe("API Utilities", () => {
  describe("validateRequest", () => {
    it("validates correct data against schema", () => {
      const schema = v.object({
        name: v.string(),
        age: v.number(),
      });

      const data = { name: "John", age: 30 };
      const result = validateRequest(schema, data);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ name: "John", age: 30 });
      }
    });

    it("rejects invalid data with error message", () => {
      const schema = v.object({
        name: v.string(),
        age: v.number(),
      });

      const data = { name: "John", age: "thirty" };
      const result = validateRequest(schema, data);

      expect(result.ok).toBe(false);
    });

    it("handles missing required fields", () => {
      const schema = v.object({
        name: v.string(),
        email: v.string(),
      });

      const data = { name: "John" };
      const result = validateRequest(schema, data);

      expect(result.ok).toBe(false);
    });

    it("accepts optional fields", () => {
      const schema = v.object({
        name: v.string(),
        nickname: v.optional(v.string()),
      });

      const data = { name: "John" };
      const result = validateRequest(schema, data);

      expect(result.ok).toBe(true);
    });

    it("validates string with pipe validators", () => {
      const schema = v.object({
        email: v.pipe(v.string(), v.email()),
      });

      const data = { email: "test@example.com" };
      const result = validateRequest(schema, data);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.email).toBe("test@example.com");
      }
    });

    it("rejects invalid email", () => {
      const schema = v.object({
        email: v.pipe(v.string(), v.email()),
      });

      const data = { email: "not-an-email" };
      const result = validateRequest(schema, data);

      expect(result.ok).toBe(false);
    });

    it("handles nested objects", () => {
      const schema = v.object({
        user: v.object({
          name: v.string(),
          age: v.number(),
        }),
      });

      const data = {
        user: { name: "John", age: 30 },
      };

      const result = validateRequest(schema, data);

      expect(result.ok).toBe(true);
    });

    it("validates arrays", () => {
      const schema = v.object({
        tags: v.array(v.string()),
      });

      const data = { tags: ["a", "b", "c"] };
      const result = validateRequest(schema, data);

      expect(result.ok).toBe(true);
    });

    it("rejects array with wrong type elements", () => {
      const schema = v.object({
        tags: v.array(v.string()),
      });

      const data = { tags: ["a", 2, "c"] };
      const result = validateRequest(schema, data);

      expect(result.ok).toBe(false);
    });
  });

  describe("ApiErrorCode enum", () => {
    it("has all required error codes", () => {
      expect(ApiErrorCode.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
      expect(ApiErrorCode.UNAUTHORIZED).toBe("UNAUTHORIZED");
      expect(ApiErrorCode.FORBIDDEN).toBe("FORBIDDEN");
      expect(ApiErrorCode.NOT_FOUND).toBe("NOT_FOUND");
      expect(ApiErrorCode.RATE_LIMITED).toBe("RATE_LIMITED");
      expect(ApiErrorCode.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
    });

    it("has correct number of error codes", () => {
      const codes = Object.values(ApiErrorCode);
      expect(codes.length).toBe(6);
    });
  });
});
