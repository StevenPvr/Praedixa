import { LinearClient } from "./linear-client.js";

describe("LinearClient", () => {
  it("normalizes candidate issues and blocker relations", async () => {
    const responses = [
      {
        data: {
          issueType: { fields: [{ name: "inverseRelations" }] },
          issueRelationType: {
            fields: [{ name: "issue" }, { name: "relatedIssue" }],
          },
        },
      },
      {
        data: {
          issues: {
            nodes: [
              {
                id: "issue-1",
                identifier: "PRX-100",
                title: "Implement Symphony",
                description: "Ship it",
                priority: 1,
                branchName: "sym/100",
                url: "https://linear.app/praedixa/issue/PRX-100",
                createdAt: "2026-03-19T00:00:00.000Z",
                updatedAt: "2026-03-19T00:00:00.000Z",
                state: { name: "Todo" },
                labels: { nodes: [{ name: "Infra" }] },
                inverseRelations: {
                  nodes: [
                    {
                      id: "rel-1",
                      type: "blocks",
                      issue: {
                        id: "issue-2",
                        identifier: "PRX-90",
                        state: { name: "In Progress" },
                      },
                      relatedIssue: {
                        id: "issue-1",
                        identifier: "PRX-100",
                        state: { name: "Todo" },
                      },
                    },
                  ],
                },
              },
            ],
            pageInfo: {
              hasNextPage: false,
              endCursor: null,
            },
          },
        },
      },
    ];

    const fetchImpl: typeof fetch = async () =>
      ({
        ok: true,
        json: async () => responses.shift(),
      }) as Response;

    const client = new LinearClient({
      tracker: {
        kind: "linear",
        endpoint: "https://api.linear.app/graphql",
        apiKey: "token",
        projectSlug: "praedixa",
        activeStates: ["Todo"],
        terminalStates: ["Done"],
        normalizedActiveStates: new Set(["todo"]),
        normalizedTerminalStates: new Set(["done"]),
      },
      fetchImpl,
    });

    const issues = await client.fetchCandidateIssues();

    expect(issues).toHaveLength(1);
    expect(issues[0]?.labels).toEqual(["infra"]);
    expect(issues[0]?.blockedBy).toEqual([
      {
        id: "issue-2",
        identifier: "PRX-90",
        state: "In Progress",
      },
    ]);
  });
});
