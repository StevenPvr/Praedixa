const now = new Date().toISOString();

export const demo = {
  organization: {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Praedixa Demo Org",
    status: "active",
    subscriptionPlan: "professional",
    createdAt: now,
    updatedAt: now,
  },
  departments: [
    {
      id: "dpt-ops",
      organizationId: "11111111-1111-1111-1111-111111111111",
      name: "Operations",
      createdAt: now,
      updatedAt: now,
    },
  ],
  sites: [
    {
      id: "site-lyon",
      organizationId: "11111111-1111-1111-1111-111111111111",
      name: "Lyon",
      timezone: "Europe/Paris",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "site-orleans",
      organizationId: "11111111-1111-1111-1111-111111111111",
      name: "Orleans",
      timezone: "Europe/Paris",
      createdAt: now,
      updatedAt: now,
    },
  ],
  forecasts: [
    {
      id: "fr-001",
      organizationId: "11111111-1111-1111-1111-111111111111",
      status: "completed",
      horizonDays: 14,
      createdAt: now,
      updatedAt: now,
    },
  ],
  decisions: [
    {
      id: "dec-001",
      organizationId: "11111111-1111-1111-1111-111111111111",
      title: "Increase PM staffing",
      status: "suggested",
      createdAt: now,
      updatedAt: now,
    },
  ],
  datasets: [
    {
      id: "ds-canonical",
      name: "canonical_records",
      status: "ready",
      rowCount: 120,
      createdAt: now,
      updatedAt: now,
    },
  ],
  alerts: [
    {
      id: "alt-001",
      organizationId: "11111111-1111-1111-1111-111111111111",
      severity: "high",
      message: "Coverage risk detected",
      createdAt: now,
      updatedAt: now,
    },
  ],
  conversations: [
    {
      id: "conv-001",
      organizationId: "11111111-1111-1111-1111-111111111111",
      subject: "Staffing alert discussion",
      status: "open",
      initiatedBy: "client",
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ],
  messages: [
    {
      id: "msg-001",
      conversationId: "conv-001",
      senderUserId: "user-001",
      senderRole: "org_admin",
      content: "Can we validate the scenario?",
      isRead: false,
      createdAt: now,
      updatedAt: now,
    },
  ],
} satisfies Record<string, unknown>;
