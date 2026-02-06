import React, { type ReactElement } from "react";
import {
  render as rtlRender,
  type RenderOptions,
} from "@testing-library/react";

// Re-export everything from testing-library
export {
  screen,
  fireEvent,
  waitFor,
  within,
  act,
  cleanup,
} from "@testing-library/react";

export { default as userEvent } from "@testing-library/user-event";

/**
 * Custom render function with optional wrapper providers.
 * Extend this to add global context providers (theme, auth, etc.)
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { wrapper?: React.ComponentType },
) {
  const { wrapper: Wrapper, ...rest } = options ?? {};

  if (Wrapper) {
    return rtlRender(ui, {
      wrapper: Wrapper,
      ...rest,
    });
  }

  return rtlRender(ui, rest);
}

export { customRender as render };
