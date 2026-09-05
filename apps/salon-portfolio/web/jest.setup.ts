import "@testing-library/jest-dom";

// jsdom does not implement IntersectionObserver. components/ui/Reveal.tsx
// (used by most sections for scroll-reveal, Phase 2A §21) needs it to
// exist at all; tests don't care about real viewport intersection, so a
// no-op stub is enough — Reveal's content still renders (just stays in
// its "hidden" transition state) either way.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn(() => []);
}

// This setup file runs for every test file regardless of its
// testEnvironment — route handler tests (e.g. app/api/health) opt into
// the node environment via a `@jest-environment node` docblock, where
// `window` does not exist at all, so guard the jsdom-only stub.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
}
if (typeof global !== "undefined") {
  Object.defineProperty(global, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
}
