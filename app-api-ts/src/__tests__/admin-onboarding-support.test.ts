import { describe, expect, it } from "vitest";

import { normalizeOnboardingTaskPayload } from "../services/admin-onboarding-support.js";

describe("admin onboarding support access model validation", () => {
  it("normalizes secure invitation evidence for the access model task", () => {
    const normalized = normalizeOnboardingTaskPayload({
      taskKey: "access-model",
      mode: "complete",
      payloadJson: {
        ssoMode: "manual",
        roleModelConfirmed: true,
        invitationsReady: true,
        siteScopesValidated: true,
        inviteRecipients: [
          {
            email: "Owner@Acme.fr",
            role: "org_admin",
            siteId: null,
            status: "sent",
            delivery: "activation_link",
            deliveryChannel: "keycloak_execute_actions_email",
            passwordHandling: "client_sets_password",
            invitedAt: "2026-03-19T09:00:00.000Z",
            invitedUserId: "11111111-1111-4111-8111-111111111111",
          },
        ],
      },
    });

    expect(normalized).toMatchObject({
      ssoMode: "manual",
      roleModelConfirmed: true,
      invitationsReady: true,
      siteScopesValidated: true,
      invitationDelivery: "activation_link",
      invitationChannel: "keycloak_execute_actions_email",
      passwordHandling: "client_sets_password",
      invitedRecipientCount: 1,
      inviteRecipients: [
        {
          email: "owner@acme.fr",
          role: "org_admin",
          status: "sent",
          invitedUserId: "11111111-1111-4111-8111-111111111111",
        },
      ],
    });
  });

  it("rejects completion when secure invitations are missing or not fully sent", () => {
    expect(() =>
      normalizeOnboardingTaskPayload({
        taskKey: "access-model",
        mode: "complete",
        payloadJson: {
          ssoMode: "manual",
          roleModelConfirmed: true,
          invitationsReady: false,
          siteScopesValidated: true,
          inviteRecipients: [
            {
              email: "manager@acme.fr",
              role: "manager",
              siteId: "22222222-2222-4222-8222-222222222222",
              status: "draft",
              delivery: "activation_link",
              deliveryChannel: "keycloak_execute_actions_email",
              passwordHandling: "client_sets_password",
            },
          ],
        },
      }),
    ).toThrow(/not successfully initialized/i);
  });
});
