import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ADMIN_PERMISSION_NAMES } from "../admin-permissions";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const contractPath = path.resolve(
  currentDir,
  "../../../../contracts/admin/permission-taxonomy.v1.json",
);

describe("ADMIN_PERMISSION_NAMES", () => {
  it("stays aligned with the versioned admin permission taxonomy", () => {
    const contract = JSON.parse(readFileSync(contractPath, "utf8")) as {
      permissions: Array<{ name: string }>;
    };

    expect(ADMIN_PERMISSION_NAMES).toEqual(
      contract.permissions.map((permission) => permission.name),
    );
  });
});
