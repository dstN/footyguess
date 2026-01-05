/**
 * Tests for CSS utilities and effects
 */

import { describe, it, expect } from "vitest";
import {
  transitionClasses,
  transitionDurations,
  easingFunctions,
  generateTransition,
} from "~/assets/css/effects";

describe("CSS Effects Utilities", () => {
  it("should have fade transition classes", () => {
    expect(transitionClasses.fade).toBeDefined();
    expect(transitionClasses.fade.enterActive).toBe("fade-enter-active");
    expect(transitionClasses.fade.leaveActive).toBe("fade-leave-active");
    expect(transitionClasses.fade.enterFrom).toBe("fade-enter-from");
    expect(transitionClasses.fade.leaveTo).toBe("fade-leave-to");
  });

  it("should have slide-up transition classes", () => {
    expect(transitionClasses.slideUp).toBeDefined();
    expect(transitionClasses.slideUp.enterActive).toBe(
      "slide-up-enter-active",
    );
  });

  it("should define transition durations", () => {
    expect(transitionDurations.fast).toBe(150);
    expect(transitionDurations.normal).toBe(250);
    expect(transitionDurations.slow).toBe(350);
    expect(transitionDurations.verySlow).toBe(500);
  });

  it("should define easing functions", () => {
    expect(easingFunctions.linear).toBe("linear");
    expect(easingFunctions.ease).toBe("ease");
    expect(easingFunctions.easeIn).toBe("ease-in");
    expect(easingFunctions.easeOut).toBe("ease-out");
    expect(easingFunctions.easeInOut).toBe("ease-in-out");
  });

  it("should generate transition CSS properties", () => {
    const transition = generateTransition(["opacity"], 250, "ease");
    expect(transition).toBe("opacity 250ms ease");
  });

  it("should handle multiple properties in transition", () => {
    const transition = generateTransition(
      ["opacity", "transform"],
      300,
      "ease-in-out",
    );
    expect(transition).toContain("opacity 300ms ease-in-out");
    expect(transition).toContain("transform 300ms ease-in-out");
  });

  it("should use defaults when not specified", () => {
    const transition = generateTransition();
    expect(transition).toContain("all");
    expect(transition).toContain("250ms"); // normal duration
    expect(transition).toContain("ease"); // default easing
  });
});
