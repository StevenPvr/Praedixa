import { describe, it, expect } from "vitest";
import {
  DURATION,
  EASING,
  STAGGER,
  fadeInUp,
  staggerContainer,
  staggerItem,
  sectionReveal,
  cardHoverScale,
  slideInRight,
} from "../config";

describe("animation config", () => {
  describe("DURATION", () => {
    it("has micro duration at 0.1s", () => {
      expect(DURATION.micro).toBe(0.1);
    });

    it("has fast duration at 0.15s", () => {
      expect(DURATION.fast).toBe(0.15);
    });

    it("has normal duration at 0.2s", () => {
      expect(DURATION.normal).toBe(0.2);
    });

    it("has page duration at 0.3s", () => {
      expect(DURATION.page).toBe(0.3);
    });

    it("has number duration at 0.4s", () => {
      expect(DURATION.number).toBe(0.4);
    });
  });

  describe("EASING", () => {
    it("has snappy easing as 4-element array", () => {
      expect(EASING.snappy).toHaveLength(4);
      expect(EASING.snappy).toEqual([0.2, 0, 0, 1]);
    });

    it("has smooth easing as 4-element array", () => {
      expect(EASING.smooth).toHaveLength(4);
      expect(EASING.smooth).toEqual([0.4, 0, 0.2, 1]);
    });

    it("has bounce easing as 4-element array", () => {
      expect(EASING.bounce).toHaveLength(4);
      expect(EASING.bounce).toEqual([0.34, 1.56, 0.64, 1]);
    });
  });

  describe("STAGGER", () => {
    it("has fast stagger at 0.03s", () => {
      expect(STAGGER.fast).toBe(0.03);
    });

    it("has normal stagger at 0.1s", () => {
      expect(STAGGER.normal).toBe(0.1);
    });
  });

  describe("fadeInUp variant", () => {
    it("has hidden state with opacity 0 and y offset", () => {
      expect(fadeInUp.hidden).toEqual({ opacity: 0, y: 20 });
    });

    it("has visible state with opacity 1 and y 0", () => {
      expect(fadeInUp.visible.opacity).toBe(1);
      expect(fadeInUp.visible.y).toBe(0);
    });

    it("uses page duration in visible transition", () => {
      expect(fadeInUp.visible.transition.duration).toBe(DURATION.page);
    });

    it("uses smooth easing in visible transition", () => {
      expect(fadeInUp.visible.transition.ease).toBe(EASING.smooth);
    });
  });

  describe("staggerContainer variant", () => {
    it("has empty hidden state", () => {
      expect(staggerContainer.hidden).toEqual({});
    });

    it("has visible state with staggerChildren", () => {
      expect(staggerContainer.visible.transition.staggerChildren).toBe(
        STAGGER.normal,
      );
    });

    it("has delayChildren of 0.1", () => {
      expect(staggerContainer.visible.transition.delayChildren).toBe(0.1);
    });
  });

  describe("staggerItem variant", () => {
    it("has hidden state with opacity 0 and y offset", () => {
      expect(staggerItem.hidden).toEqual({ opacity: 0, y: 20 });
    });

    it("has visible state with opacity 1 and y 0", () => {
      expect(staggerItem.visible.opacity).toBe(1);
      expect(staggerItem.visible.y).toBe(0);
    });

    it("uses page duration", () => {
      expect(staggerItem.visible.transition.duration).toBe(DURATION.page);
    });

    it("uses smooth easing", () => {
      expect(staggerItem.visible.transition.ease).toBe(EASING.smooth);
    });
  });

  describe("sectionReveal variant", () => {
    it("has hidden state with opacity 0 and y 20", () => {
      expect(sectionReveal.hidden).toEqual({ opacity: 0, y: 20 });
    });

    it("has visible state with opacity 1 and y 0", () => {
      expect(sectionReveal.visible.opacity).toBe(1);
      expect(sectionReveal.visible.y).toBe(0);
    });

    it("uses 0.6s duration", () => {
      expect(sectionReveal.visible.transition.duration).toBe(0.6);
    });

    it("uses smooth easing", () => {
      expect(sectionReveal.visible.transition.ease).toBe(EASING.smooth);
    });
  });

  describe("cardHoverScale variant", () => {
    it("has rest state with scale 1 and y 0", () => {
      expect(cardHoverScale.rest).toEqual({ scale: 1, y: 0 });
    });

    it("has hover state with scale 1.02 and y -4", () => {
      expect(cardHoverScale.hover.scale).toBe(1.02);
      expect(cardHoverScale.hover.y).toBe(-4);
    });

    it("uses normal duration in hover transition", () => {
      expect(cardHoverScale.hover.transition.duration).toBe(DURATION.normal);
    });

    it("uses snappy easing in hover transition", () => {
      expect(cardHoverScale.hover.transition.ease).toBe(EASING.snappy);
    });
  });

  describe("slideInRight variant", () => {
    it("has hidden state with opacity 0 and x 30", () => {
      expect(slideInRight.hidden).toEqual({ opacity: 0, x: 30 });
    });

    it("has visible state with opacity 1 and x 0", () => {
      expect(slideInRight.visible.opacity).toBe(1);
      expect(slideInRight.visible.x).toBe(0);
    });

    it("uses 0.5s duration", () => {
      expect(slideInRight.visible.transition.duration).toBe(0.5);
    });

    it("uses smooth easing", () => {
      expect(slideInRight.visible.transition.ease).toBe(EASING.smooth);
    });
  });
});
