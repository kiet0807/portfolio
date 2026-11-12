import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/* jsdom does not implement these browser APIs. */

function createMatchMedia(matches: (query: string) => boolean) {
  return (query: string): MediaQueryList => ({
    matches: matches(query),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    /* eslint-disable @typescript-eslint/no-deprecated -- legacy members are still part of the MediaQueryList type */
    addListener: vi.fn(),
    removeListener: vi.fn(),
    /* eslint-enable @typescript-eslint/no-deprecated */
    dispatchEvent: vi.fn(() => false),
  });
}

/** Lets a test choose which media queries match (e.g. prefers-color-scheme). */
export function mockMatchMedia(matches: (query: string) => boolean = () => false): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: createMatchMedia(matches),
  });
}

class IntersectionObserverStub implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly scrollMargin = '';
  readonly thresholds: readonly number[] = [];
  observe(): void {
    /* no-op */
  }
  unobserve(): void {
    /* no-op */
  }
  disconnect(): void {
    /* no-op */
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

beforeEach(() => {
  mockMatchMedia();
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  window.scrollBy = vi.fn();
  // jsdom has no canvas: report "no WebGL" quietly, which is also the path we want to test.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as typeof HTMLCanvasElement.prototype.getContext;
  window.localStorage.clear();
  document.documentElement.lang = 'en';
  document.documentElement.setAttribute('data-theme', 'dark');
  window.history.replaceState(null, '', '/en');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
