import type { PublicApiOperationContract } from "./common.js";
import { PUBLIC_API_BUSINESS_OPERATIONS } from "./operations-business.js";
import { PUBLIC_API_ENGAGEMENT_OPERATIONS } from "./operations-engagement.js";
import { PUBLIC_API_LIVE_OPERATIONS } from "./operations-live.js";
import type { PublicApiSharedTypeName } from "./types.js";

type TypedPublicApiOperationContract =
  PublicApiOperationContract<PublicApiSharedTypeName>;

export const PUBLIC_API_OPERATIONS = [
  ...PUBLIC_API_LIVE_OPERATIONS,
  ...PUBLIC_API_BUSINESS_OPERATIONS,
  ...PUBLIC_API_ENGAGEMENT_OPERATIONS,
] as const satisfies readonly TypedPublicApiOperationContract[];
