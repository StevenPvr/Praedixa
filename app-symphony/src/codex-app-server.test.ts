import { validateLinearGraphqlToolArguments } from "./codex-app-server.js";

describe("validateLinearGraphqlToolArguments", () => {
  it("accepts a single GraphQL operation", () => {
    expect(
      validateLinearGraphqlToolArguments({
        query: "query One { viewer { id } }",
        variables: { projectSlug: "praedixa" },
      }),
    ).toEqual({
      query: "query One { viewer { id } }",
      variables: { projectSlug: "praedixa" },
      error: null,
    });
  });

  it("rejects multiple GraphQL operations in one tool call", () => {
    expect(
      validateLinearGraphqlToolArguments({
        query:
          "query One { viewer { id } } query Two { teams { nodes { id } } }",
      }).error,
    ).toBe("query must contain exactly one GraphQL operation");
  });

  it("rejects non-object variables", () => {
    expect(
      validateLinearGraphqlToolArguments({
        query: "query One { viewer { id } }",
        variables: ["not", "an", "object"],
      }).error,
    ).toBe("variables must be a JSON object when provided");
  });
});
