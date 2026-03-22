import assert from "node:assert/strict";
import test from "node:test";

import { validateContractTsParity } from "../check-contract-ts-parity.mjs";

test("contract-ts parity validates committed mirrored contracts", () => {
  assert.deepEqual(validateContractTsParity(), []);
});

test("contract-ts parity rejects missing TypeScript mirror content", () => {
  const errors = validateContractTsParity([
    {
      contractPath: "contracts/decisionops/approval.schema.json",
      tsPath: "packages/shared-types/src/domain/approval.ts",
      checks: [
        {
          type: "jsonConst",
          jsonPath: ["properties", "kind", "const"],
          expectedInTs: 'kind: "ApprovalBroken"',
        },
      ],
    },
  ]);

  assert.match(errors.join("\n"), /ApprovalBroken/);
});

test("contract-ts parity rejects missing admin permission mirror", () => {
  const errors = validateContractTsParity([
    {
      contractPath: "contracts/admin/permission-taxonomy.v1.json",
      tsPath: "packages/shared-types/src/admin-permissions.ts",
      checks: [
        {
          type: "jsonConst",
          jsonPath: ["schema_version"],
          expectedInTs: "__missing_schema_version_marker__",
        },
      ],
    },
  ]);

  assert.match(errors.join("\n"), /__missing_schema_version_marker__/);
});
