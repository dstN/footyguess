import { vi, beforeEach } from "vitest";
import { ref, reactive, computed, watch } from "vue";

process.env.FOOTYGUESS_DB_PATH = ":memory:";
process.env.SCORING_SECRET = "test-secret";
process.env.NODE_ENV = "test";

export const routerPushMock = vi.fn();
export const toastAddMock = vi.fn();

vi.mock("#imports", () => ({
  useRouter: () => ({ push: routerPushMock }),
  useToast: () => ({ add: toastAddMock }),
  inject: () => undefined,
  onMounted: () => {},
  useHead: () => {},
}));

// Also expose globals so auto-imported composables (without explicit imports) work in tests.
(globalThis as any).useRouter = () => ({ push: routerPushMock });
(globalThis as any).useToast = () => ({ add: toastAddMock });
(globalThis as any).inject = () => undefined;
(globalThis as any).onMounted = () => {};
(globalThis as any).useHead = () => {};
(globalThis as any).ref = ref;
(globalThis as any).reactive = reactive;
(globalThis as any).computed = computed;
(globalThis as any).watch = watch;
(globalThis as any).localStorage = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] ?? null;
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  removeItem(key: string) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  },
};

beforeEach(() => {
  routerPushMock.mockReset();
  toastAddMock.mockReset();
});
