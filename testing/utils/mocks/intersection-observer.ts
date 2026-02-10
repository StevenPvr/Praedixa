import { vi } from "vitest";

type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void;

const observers = new Set<{
  callback: IntersectionCallback;
  elements: Set<Element>;
}>();

export class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "0px";
  readonly thresholds: ReadonlyArray<number> = [0];

  private callback: IntersectionCallback;
  private elements = new Set<Element>();

  constructor(
    callback: IntersectionCallback,
    _options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    observers.add({ callback: this.callback, elements: this.elements });
  }

  observe(element: Element) {
    this.elements.add(element);
  }

  unobserve(element: Element) {
    this.elements.delete(element);
  }

  disconnect() {
    this.elements.clear();
    observers.forEach((obs) => {
      if (obs.callback === this.callback) {
        observers.delete(obs);
      }
    });
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

export function triggerIntersection(isIntersecting: boolean, target?: Element) {
  observers.forEach(({ callback, elements }) => {
    const entries = Array.from(elements)
      .filter((el) => !target || el === target)
      .map(
        (el) =>
          ({
            isIntersecting,
            target: el,
            intersectionRatio: isIntersecting ? 1 : 0,
            boundingClientRect: el.getBoundingClientRect(),
            intersectionRect: el.getBoundingClientRect(),
            rootBounds: null,
            time: Date.now(),
          }) as IntersectionObserverEntry,
      );

    if (entries.length > 0) {
      callback(entries);
    }
  });
}

export function resetIntersectionObserver() {
  observers.clear();
}

export function installMockIntersectionObserver() {
  global.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;
}
