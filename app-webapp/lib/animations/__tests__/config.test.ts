import { describe, it, expect } from "vitest";
import {
  DURATION,
  EASING,
  SPRING,
  sectionReveal,
  staggerContainer,
  staggerItem,
  buttonPress,
} from "../config";

describe("animation config", () => {
  describe("DURATION", () => {
    it("has micro duration at 0.12s", () => {
      expect(DURATION.micro).toBe(0.12);
    });

    it("has fast duration at 0.2s", () => {
      expect(DURATION.fast).toBe(0.2);
    });

    it("has normal duration at 0.3s", () => {
      expect(DURATION.normal).toBe(0.3);
    });

    it("has page duration at 0.4s", () => {
      expect(DURATION.page).toBe(0.4);
    });

    it("has number duration at 0.7s", () => {
      expect(DURATION.number).toBe(0.7);
    });

    it("has draw duration at 1.2s", () => {
      expect(DURATION.draw).toBe(1.2);
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

    it("has spring easing as 4-element array", () => {
      expect(EASING.spring).toHaveLength(4);
    });
  });

  describe("SPRING presets", () => {
    it("has snappy spring config", () => {
      expect(SPRING.snappy.type).toBe("spring");
      expect(SPRING.snappy.stiffness).toBe(500);
    });

    it("has gentle spring config", () => {
      expect(SPRING.gentle.type).toBe("spring");
    });

    it("has bouncy spring config", () => {
      expect(SPRING.bouncy.type).toBe("spring");
      expect(SPRING.bouncy.damping).toBe(17);
    });
  });

  describe("sectionReveal variant", () => {
    it("has hidden state with opacity 0 and y 12", () => {
      expect(sectionReveal.hidden).toEqual({ opacity: 0, y: 12 });
    });

    it("has visible state with opacity 1 and y 0", () => {
      expect(sectionReveal.visible.opacity).toBe(1);
      expect(sectionReveal.visible.y).toBe(0);
    });

    it("uses 0.55s duration", () => {
      expect(sectionReveal.visible.transition.duration).toBe(0.55);
    });

    it("uses premium easing", () => {
      expect(sectionReveal.visible.transition.ease).toBe(EASING.premium);
    });
  });

  describe("stagger variants", () => {
    it("staggerContainer staggers children", () => {
      expect(staggerContainer.visible.transition.staggerChildren).toBe(0.06);
    });

    it("staggerItem starts hidden", () => {
      expect(staggerItem.hidden.opacity).toBe(0);
    });
  });

  describe("buttonPress variant", () => {
    it("scales down on tap", () => {
      expect(buttonPress.tap.scale).toBe(0.97);
    });

    it("scales up on hover", () => {
      expect(buttonPress.hover.scale).toBe(1.02);
    });
  });
});
