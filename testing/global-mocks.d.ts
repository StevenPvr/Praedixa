import type { createUiMocks } from "./utils/mocks/ui";
import type {
  createNextNavigationMocks,
  createNextImageMock,
} from "./utils/mocks/next";
import type { createLucideIconMocks } from "./utils/mocks/icons";

declare global {
  // eslint-disable-next-line no-var
  var __mocks: {
    createUiMocks: typeof createUiMocks;
    createNextNavigationMocks: typeof createNextNavigationMocks;
    createNextImageMock: typeof createNextImageMock;
    createLucideIconMocks: typeof createLucideIconMocks;
  };
}
