/**
 * CSS Utilities for Effects and Animations
 * Centralized styling for transitions and animations
 */

export const transitionClasses = {
  // Fade transition classes (for Vue Transition)
  fade: {
    enterActive: "fade-enter-active",
    leaveActive: "fade-leave-active",
    enterFrom: "fade-enter-from",
    leaveTo: "fade-leave-to",
  },

  // Slide transition classes
  slideUp: {
    enterActive: "slide-up-enter-active",
    leaveActive: "slide-up-leave-active",
    enterFrom: "slide-up-enter-from",
    leaveTo: "slide-up-leave-to",
  },
} as const;

/**
 * Common transition duration constants (in milliseconds)
 */
export const transitionDurations = {
  fast: 150,
  normal: 250,
  slow: 350,
  verySlow: 500,
} as const;

/**
 * Common easing functions
 */
export const easingFunctions = {
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  custom: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

/**
 * Generate transition CSS property
 */
export function generateTransition(
  properties: string[] = ["all"],
  duration: number = transitionDurations.normal,
  easing: string = easingFunctions.ease,
): string {
  return properties.map((prop) => `${prop} ${duration}ms ${easing}`).join(", ");
}
