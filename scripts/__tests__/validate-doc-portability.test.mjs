import assert from "node:assert/strict";
import test from "node:test";

import {
  scanMarkdownForPortabilityViolations,
  validateDocPortability,
} from "../validate-doc-portability.mjs";

test("doc portability validator passes on the committed baseline", () => {
  assert.deepEqual(validateDocPortability(), []);
});

test("doc portability validator rejects local filesystem paths", () => {
  const violations = scanMarkdownForPortabilityViolations(
    "/virtual/README.md",
    [
      "Voir [guide](/Users/steven/Programmation/praedixa/docs/runbooks/test.md).",
      "Ou file:///Users/steven/Programmation/praedixa/docs/runbooks/test.md",
    ].join("\n"),
  );

  assert.equal(violations.length, 2);
  assert.equal(violations[0].lineNumber, 1);
  assert.match(violations[0].value, /\/Users\/steven\//);
  assert.equal(violations[1].lineNumber, 2);
  assert.match(violations[1].value, /file:\/\/\/Users\/steven\//);
});
