import {
  arrayOf,
  booleanSchema,
  integerSchema,
  mapOf,
  numberSchema,
  objectSchema,
  stringSchema,
  type PublicJsonSchema,
} from "./schema-helpers.js";
import {
  isoDateTimeSchema,
  uiDensitySchema,
  userLanguageSchema,
  uuidSchema,
} from "./response-schema-fragments.js";

function savedViewSchema(): PublicJsonSchema {
  return objectSchema(
    {
      id: stringSchema(),
      name: stringSchema(),
      resource: stringSchema(),
      scope: stringSchema({ enum: ["personal", "team"] }),
      filters: mapOf({}),
      sort: objectSchema({
        key: stringSchema(),
        direction: stringSchema({ enum: ["asc", "desc"] }),
      }),
      columns: arrayOf(stringSchema()),
      groupBy: arrayOf(stringSchema()),
      isDefault: booleanSchema(),
      updatedAt: isoDateTimeSchema,
    },
    ["id", "name", "resource", "scope"],
  );
}

export function userUxPreferencesSchema(): PublicJsonSchema {
  return objectSchema(
    {
      userId: uuidSchema,
      language: userLanguageSchema,
      density: uiDensitySchema,
      defaultLanding: stringSchema(),
      dismissedCoachmarks: arrayOf(stringSchema()),
      nav: objectSchema({
        sidebarCollapsed: booleanSchema(),
        sidebarWidth: numberSchema(),
        starredItems: arrayOf(stringSchema()),
        recentItems: arrayOf(stringSchema()),
      }),
      tables: mapOf(
        objectSchema({
          density: uiDensitySchema,
          pageSize: integerSchema({ minimum: 1 }),
          columns: arrayOf(stringSchema()),
          sort: objectSchema({
            key: stringSchema(),
            direction: stringSchema({ enum: ["asc", "desc"] }),
          }),
        }),
      ),
      savedViews: arrayOf(savedViewSchema()),
      theme: objectSchema({
        mode: stringSchema({ enum: ["light", "dark", "system"] }),
      }),
    },
    ["language", "density", "defaultLanding", "dismissedCoachmarks"],
  );
}
