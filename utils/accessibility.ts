/**
 * Accessibility utilities and helpers for WCAG 2.1 compliance
 * Provides functions to improve keyboard navigation and screen reader support
 */

/**
 * Skip to main content link handler
 * Allows keyboard users to bypass navigation and jump to main content
 *
 * @example
 * <a href="#main-content" @click="skipToMainContent" class="sr-only focus:not-sr-only">
 *   Skip to main content
 * </a>
 */
export function skipToMainContent(): void {
  const mainElement = document.querySelector("main");
  if (mainElement) {
    mainElement.focus();
    mainElement.scrollIntoView();
  }
}

/**
 * Announce message to screen readers
 * Creates a temporary live region to announce changes
 *
 * @param message - Message to announce
 * @param priority - 'polite' (default) or 'assertive' for interrupting
 *
 * @example
 * announceToScreenReader('Game won! You scored 500 points', 'assertive');
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite",
): void {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement is read
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if user prefers reduced motion
 * Respects 'prefers-reduced-motion' media query
 *
 * @returns true if user prefers reduced motion
 *
 * @example
 * if (prefersReducedMotion()) {
 *   // Skip animations
 * }
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Check if user prefers dark mode
 * Respects 'prefers-color-scheme' media query
 *
 * @returns true if user prefers dark mode
 */
export function prefersDarkMode(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Make an element focusable for keyboard navigation
 * Useful for making div elements focusable when needed
 *
 * @param element - Element to make focusable
 *
 * @example
 * const element = document.querySelector('.modal');
 * makeElementFocusable(element);
 */
export function makeElementFocusable(element: HTMLElement): void {
  if (!element.hasAttribute("tabindex")) {
    element.setAttribute("tabindex", "-1");
  }
}

/**
 * Safely set aria-label with fallback for empty strings
 * Prevents empty aria-labels which can confuse screen readers
 *
 * @param element - Element to set aria-label on
 * @param label - Label text
 */
export function setAccessibleLabel(element: HTMLElement, label: string): void {
  if (label.trim()) {
    element.setAttribute("aria-label", label);
  } else {
    element.removeAttribute("aria-label");
  }
}

/**
 * Get the currently focused element
 * Useful for maintaining focus management in modals
 *
 * @returns Currently focused element or null
 */
export function getFocusedElement(): HTMLElement | null {
  return document.activeElement as HTMLElement | null;
}

/**
 * Restore focus to previously focused element
 * Useful after closing modals or temporary UI changes
 *
 * @param element - Element to focus
 */
export function restoreFocus(element: HTMLElement | null): void {
  if (element && element.focus instanceof Function) {
    element.focus();
  }
}

/**
 * Create a focus trap for modal dialogs
 * Keeps keyboard focus within the modal
 *
 * @param element - Modal container element
 *
 * @example
 * const modal = document.querySelector('[role="dialog"]');
 * const removeTrap = createFocusTrap(modal);
 * // ... when modal closes:
 * removeTrap();
 */
export function createFocusTrap(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll(
    'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
  ) as NodeListOf<HTMLElement>;

  if (focusableElements.length === 0) return () => {};

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement?.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    }
  };

  element.addEventListener("keydown", handleKeyDown);

  return () => {
    element.removeEventListener("keydown", handleKeyDown);
  };
}
