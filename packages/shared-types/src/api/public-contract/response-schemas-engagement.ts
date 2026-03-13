import type { PublicApiResponseTypeName } from "./types.js";
import {
  arrayOf,
  integerSchema,
  objectSchema,
  stringSchema,
  type PublicJsonSchema,
} from "./schema-helpers.js";
import { userUxPreferencesSchema } from "./response-schema-fragments-preferences.js";

export const PUBLIC_API_ENGAGEMENT_RESPONSE_SCHEMAS = {
  UserUxPreferences: userUxPreferencesSchema(),
  ProductEventBatchAccepted: objectSchema(
    { accepted: integerSchema({ minimum: 0 }) },
    ["accepted"],
  ),
  ConversationSummary: objectSchema(
    {
      id: stringSchema(),
      subject: stringSchema(),
      status: stringSchema(),
    },
    ["id"],
  ),
  ConversationMessage: objectSchema(
    {
      id: stringSchema(),
      conversationId: stringSchema(),
      content: stringSchema(),
    },
    ["id", "conversationId", "content"],
  ),
  ConversationUnreadCount: objectSchema(
    { unreadCount: integerSchema({ minimum: 0 }) },
    ["unreadCount"],
  ),
  SupportThreadView: objectSchema(
    {
      id: stringSchema(),
      status: stringSchema(),
      messages: arrayOf(
        objectSchema(
          {
            id: stringSchema(),
            content: stringSchema(),
          },
          ["id", "content"],
        ),
      ),
    },
    ["id", "status", "messages"],
  ),
  SupportThreadMessage: objectSchema(
    { id: stringSchema(), content: stringSchema() },
    ["id", "content"],
  ),
} as const satisfies Partial<
  Record<PublicApiResponseTypeName, PublicJsonSchema>
>;
