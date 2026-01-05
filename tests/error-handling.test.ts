/**
 * Tests for retry and circuit breaker utilities
 */

import { describe, it, expect, vi } from "vitest";
import {
  isRetryableError,
  calculateBackoffDelay,
  withRetry,
  DEFAULT_RETRY_CONFIG,
} from "~/server/utils/retry";
import {
  CircuitBreaker,
  CircuitState,
  DEFAULT_CIRCUIT_CONFIG,
} from "~/server/utils/circuit-breaker";

describe("Retry Logic", () => {
  it("should identify retryable errors", () => {
    expect(isRetryableError(new Error("timeout"))).toBe(true);
    expect(isRetryableError(new Error("ECONNREFUSED"))).toBe(true);
    expect(isRetryableError(new Error("ETIMEDOUT"))).toBe(true);
    expect(isRetryableError(new Error("503 Service Unavailable"))).toBe(true);
  });

  it("should not retry non-transient errors", () => {
    expect(isRetryableError(new Error("Invalid input"))).toBe(false);
    expect(isRetryableError(new Error("404 Not Found"))).toBe(false);
  });

  it("should calculate backoff delays with exponential growth", () => {
    const delay1 = calculateBackoffDelay(1, DEFAULT_RETRY_CONFIG);
    const delay2 = calculateBackoffDelay(2, DEFAULT_RETRY_CONFIG);
    const delay3 = calculateBackoffDelay(3, DEFAULT_RETRY_CONFIG);

    expect(delay1).toBeLessThan(delay2);
    expect(delay2).toBeLessThan(delay3);
    expect(delay3).toBeLessThanOrEqual(DEFAULT_RETRY_CONFIG.maxDelayMs);
  });

  it("should respect max delay", () => {
    // Run multiple times to account for jitter
    for (let i = 0; i < 10; i++) {
      const delay = calculateBackoffDelay(10, DEFAULT_RETRY_CONFIG);
      // Allow 10% tolerance for jitter
      expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_CONFIG.maxDelayMs * 1.1);
    }
  });

  it("should retry on transient errors", async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error("timeout");
      }
      return "success";
    });

    const result = await withRetry(fn, {
      maxAttempts: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffFactor: 2,
    });

    expect(result).toBe("success");
    expect(attempts).toBe(3);
  });

  it("should fail after max attempts", async () => {
    const fn = vi.fn(async () => {
      throw new Error("timeout");
    });

    await expect(
      withRetry(fn, {
        maxAttempts: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffFactor: 2,
      }),
    ).rejects.toThrow("timeout");

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should not retry non-retryable errors", async () => {
    const fn = vi.fn(async () => {
      throw new Error("Invalid input");
    });

    await expect(withRetry(fn)).rejects.toThrow("Invalid input");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("Circuit Breaker", () => {
  it("should start in closed state", () => {
    const breaker = new CircuitBreaker();
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    expect(breaker.isOpen()).toBe(false);
  });

  it("should open after threshold failures", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });

    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.isOpen()).toBe(false);

    breaker.recordFailure();
    expect(breaker.isOpen()).toBe(true);
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it("should transition to half-open after timeout", () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 100,
    });

    breaker.recordFailure();
    expect(breaker.isOpen()).toBe(true);

    // Immediately, should still be open
    expect(breaker.isOpen()).toBe(true);

    // After timeout, should allow half-open attempts
    vi.useFakeTimers();
    vi.advanceTimersByTime(150);

    // Now it should be in half-open (not open)
    expect(breaker.isOpen()).toBe(false);
    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

    vi.useRealTimers();
  });

  it("should succeed requests when closed", async () => {
    const breaker = new CircuitBreaker();
    const fn = vi.fn(async () => "success");

    const result = await breaker.execute(fn);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalled();
  });

  it("should fail requests when open", async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    breaker.recordFailure();

    const fn = vi.fn(async () => "success");

    await expect(breaker.execute(fn)).rejects.toThrow(
      "Circuit breaker is open",
    );
    expect(fn).not.toHaveBeenCalled();
  });

  it("should record failures through execute", async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    const fn = vi.fn(async () => {
      throw new Error("test error");
    });

    await expect(breaker.execute(fn)).rejects.toThrow("test error");
    expect(breaker.isOpen()).toBe(true);
  });
});
