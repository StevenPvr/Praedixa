import { vi } from "vitest";
import React, { forwardRef } from "react";

type MotionComponent = React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement>
>;

function createMotionProxy(): Record<string, MotionComponent> {
  return new Proxy({} as Record<string, MotionComponent>, {
    get: (_target, prop: string) => {
      return forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
        (props, ref) => {
          const {
            // Strip framer-motion-specific props so they don't leak to DOM
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            initial: _initial,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            animate: _animate,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            exit: _exit,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            transition: _transition,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            variants: _variants,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            whileHover: _whileHover,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            whileTap: _whileTap,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            whileInView: _whileInView,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            viewport: _viewport,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            layout: _layout,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            layoutId: _layoutId,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            drag: _drag,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            dragConstraints: _dragConstraints,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            onAnimationComplete: _onAnimationComplete,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            style: _style,
            ...rest
          } = props as Record<string, unknown>;

          return React.createElement(prop, { ...rest, ref });
        },
      );
    },
  });
}

const motion = createMotionProxy();

let mockInViewValue = true;

export function setMockInView(value: boolean) {
  mockInViewValue = value;
}

export function resetFramerMotion() {
  mockInViewValue = true;
}

const useInView = vi.fn((_ref: unknown, _opts?: unknown) => mockInViewValue);

const useScroll = vi.fn(() => ({
  scrollY: { get: () => 0, set: vi.fn(), onChange: vi.fn() },
  scrollYProgress: { get: () => 0, set: vi.fn(), onChange: vi.fn() },
  scrollX: { get: () => 0, set: vi.fn(), onChange: vi.fn() },
  scrollXProgress: { get: () => 0, set: vi.fn(), onChange: vi.fn() },
}));

const useTransform = vi.fn(
  (_value: unknown, _inputRange?: unknown, _outputRange?: unknown) => ({
    get: () => 0,
    set: vi.fn(),
    onChange: vi.fn(),
  }),
);

const useMotionValue = vi.fn((initial: number = 0) => ({
  get: () => initial,
  set: vi.fn(),
  onChange: vi.fn(),
}));

const useSpring = vi.fn((value: unknown) => value);

const useAnimation = vi.fn(() => ({
  start: vi.fn(() => Promise.resolve()),
  stop: vi.fn(),
  set: vi.fn(),
}));

function AnimatePresence({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

const useReducedMotion = vi.fn(() => false);

export function createFramerMotionMock() {
  return {
    motion,
    AnimatePresence,
    useInView,
    useScroll,
    useTransform,
    useMotionValue,
    useSpring,
    useAnimation,
    useReducedMotion,
  };
}

export {
  motion,
  AnimatePresence,
  useInView,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useAnimation,
  useReducedMotion,
};
