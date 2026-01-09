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

// Define a type for the test globals
interface TestGlobals {
  useRouter: () => { push: typeof routerPushMock };
  useToast: () => { add: typeof toastAddMock };
  inject: () => undefined;
  onMounted: () => void;
  useHead: () => void;
  ref: typeof ref;
  reactive: typeof reactive;
  computed: typeof computed;
  watch: typeof watch;
  localStorage: Storage & {
    store: Record<string, string>;
  };
}

// Expose globals so auto-imported composables (without explicit imports) work in tests.
const testGlobals = globalThis as typeof globalThis & TestGlobals;
testGlobals.useRouter = () => ({ push: routerPushMock });
testGlobals.useToast = () => ({ add: toastAddMock });
testGlobals.inject = () => undefined;
testGlobals.onMounted = () => {};
testGlobals.useHead = () => {};
testGlobals.ref = ref;
testGlobals.reactive = reactive;
testGlobals.computed = computed;
testGlobals.watch = watch;
testGlobals.localStorage = {
  store: {} as Record<string, string>,
  get length() {
    return Object.keys(this.store).length;
  },
  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] ?? null;
  },
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
