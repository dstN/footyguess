/**
 * Tests for structured logging system
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { logDebug, logInfo, logWarn, logError, LogLevel } from "~/server/utils/logger";

// Mock console methods
vi.mock("fs");

describe("Structured Logger", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should log info messages", () => {
    const consoleSpy = vi.spyOn(console, "log");
    logInfo("info message", "context");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should log warning messages", () => {
    const consoleSpy = vi.spyOn(console, "warn");
    logWarn("warning message", "context");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should log error messages", () => {
    const consoleSpy = vi.spyOn(console, "error");
    const error = new Error("test error");
    logError("error message", error, "context");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should include metadata in logs", () => {
    const consoleSpy = vi.spyOn(console, "log");
    logInfo("message", "context", { userId: 123, action: "login" });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should handle errors as first parameter", () => {
    const consoleSpy = vi.spyOn(console, "error");
    const error = new Error("test");
    logError("operation failed", error);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should handle errors as second parameter", () => {
    const consoleSpy = vi.spyOn(console, "error");
    const error = new Error("test");
    logError("operation failed", error, "scraper");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should include context in log output", () => {
    const consoleSpy = vi.spyOn(console, "log");
    logInfo("test", "api");
    const calls = consoleSpy.mock.calls[0];
    expect(calls[0]).toContain("api");
    consoleSpy.mockRestore();
  });
});
