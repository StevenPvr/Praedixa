const KEYCLOAK_REQUEST_TIMEOUT_MS = 10_000;

export type ManagedAdminUserRole =
  | "org_admin"
  | "hr_manager"
  | "manager"
  | "employee"
  | "viewer";

export interface KeycloakProvisionUserInput {
  email: string;
  organizationId: string;
  role: ManagedAdminUserRole;
  siteId: string | null;
}

export interface KeycloakSyncUserInput {
  authUserId: string;
  organizationId: string;
  role: ManagedAdminUserRole;
  siteId: string | null;
  enabled: boolean;
}

export interface KeycloakManagedUserRecord {
  authUserId: string;
  username: string | null;
  email: string | null;
  organizationId: string | null;
  role: ManagedAdminUserRole | null;
  siteId: string | null;
  enabled: boolean | null;
}

interface KeycloakServiceConfig {
  adminRealm: string;
  appRealm: string;
  baseUrl: string;
  authMode?: "password" | "client_credentials";
  adminUsername?: string;
  adminPassword?: string;
  adminClientId?: string;
  adminClientSecret?: string;
}

interface KeycloakTokenResponse {
  access_token?: string;
}

interface KeycloakUserRepresentation {
  id?: string;
  username?: string;
  email?: string;
  enabled?: boolean;
  emailVerified?: boolean;
  requiredActions?: string[];
  attributes?: Record<string, unknown>;
}

interface KeycloakRoleRepresentation {
  id: string;
  name: string;
}

const MANAGED_ADMIN_USER_ROLES: readonly ManagedAdminUserRole[] = [
  "org_admin",
  "hr_manager",
  "manager",
  "employee",
  "viewer",
];

const INVITE_REQUIRED_ACTIONS = ["UPDATE_PASSWORD"] as const;
const NULL_SENDER_ERROR_PATTERN = /Invalid sender address 'null'/i;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function normalizeAttributes(
  attributes: Record<string, unknown> | undefined,
): Record<string, string[]> {
  const normalized: Record<string, string[]> = {};
  if (!attributes) {
    return normalized;
  }

  for (const [key, rawValue] of Object.entries(attributes)) {
    if (typeof rawValue === "string") {
      normalized[key] = [rawValue];
      continue;
    }
    if (Array.isArray(rawValue)) {
      normalized[key] = rawValue
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    }
  }

  return normalized;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!isObjectRecord(payload)) {
    return null;
  }

  const candidates = [
    payload["errorMessage"],
    payload["error_description"],
    payload["error"],
    payload["message"],
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

function isMissingRealmEmailSenderError(message: string): boolean {
  return NULL_SENDER_ERROR_PATTERN.test(message);
}

function extractRealmFromIssuer(issuerUrl: string): {
  appRealm: string;
  baseUrl: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(issuerUrl);
  } catch {
    throw new Error("AUTH_ISSUER_URL must be an absolute URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("AUTH_ISSUER_URL must use http(s)");
  }

  const realmMarker = "/realms/";
  const markerIndex = parsed.pathname.indexOf(realmMarker);
  if (markerIndex === -1) {
    throw new Error(
      "AUTH_ISSUER_URL must point to a Keycloak realm path ending in /realms/<realm>",
    );
  }

  const realmPath = parsed.pathname.slice(markerIndex + realmMarker.length);
  const [rawRealm, ...rest] = realmPath.split("/").filter(Boolean);
  if (!rawRealm || rest.length > 0) {
    throw new Error(
      "AUTH_ISSUER_URL must point to a Keycloak realm path ending in /realms/<realm>",
    );
  }

  const prefix = parsed.pathname.slice(0, markerIndex).replace(/\/$/, "");
  const baseUrl = `${parsed.origin}${prefix}`;

  return {
    appRealm: decodeURIComponent(rawRealm),
    baseUrl,
  };
}

function buildUserAttributes(
  input: Pick<KeycloakSyncUserInput, "organizationId" | "role" | "siteId">,
  existing?: Record<string, unknown>,
): Record<string, string[]> {
  const attributes = normalizeAttributes(existing);
  attributes["role"] = [input.role];
  attributes["organization_id"] = [input.organizationId];
  if (input.siteId) {
    attributes["site_id"] = [input.siteId];
  } else {
    delete attributes["site_id"];
  }
  delete attributes["permissions"];
  return attributes;
}

function normalizeRequiredActions(requiredActions: unknown): string[] {
  if (!Array.isArray(requiredActions)) {
    return [];
  }
  return Array.from(
    new Set(
      requiredActions
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  );
}

function isManagedAdminUserRole(value: string): value is ManagedAdminUserRole {
  return MANAGED_ADMIN_USER_ROLES.includes(value as ManagedAdminUserRole);
}

function mapManagedUserRecord(
  user: KeycloakUserRepresentation,
): KeycloakManagedUserRecord | null {
  const authUserId = user.id?.trim() ?? "";
  if (!authUserId) {
    return null;
  }

  const attributes = normalizeAttributes(user.attributes);
  const roleValue = attributes["role"]?.[0]?.trim() ?? "";

  return {
    authUserId,
    username: user.username?.trim().toLowerCase() || null,
    email: user.email?.trim().toLowerCase() || null,
    organizationId: attributes["organization_id"]?.[0]?.trim() || null,
    role: isManagedAdminUserRole(roleValue) ? roleValue : null,
    siteId: attributes["site_id"]?.[0]?.trim() || null,
    enabled: typeof user.enabled === "boolean" ? user.enabled : null,
  };
}

function dedupeManagedUsers(
  users: KeycloakManagedUserRecord[],
): KeycloakManagedUserRecord[] {
  const unique = new Map<string, KeycloakManagedUserRecord>();
  for (const user of users) {
    unique.set(user.authUserId, user);
  }
  return Array.from(unique.values());
}

export class KeycloakAdminIdentityError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "KeycloakAdminIdentityError";
  }
}

export class KeycloakAdminIdentityService {
  constructor(private readonly config: KeycloakServiceConfig) {}

  async provisionUser(
    input: KeycloakProvisionUserInput,
  ): Promise<{ authUserId: string }> {
    const accessToken = await this.getAccessToken();
    const authUserId = await this.createUser(accessToken, input);

    try {
      await this.syncUserWithAccessToken(accessToken, {
        authUserId,
        organizationId: input.organizationId,
        role: input.role,
        siteId: input.siteId,
        enabled: true,
      });
      await this.sendInviteEmail(accessToken, authUserId);
      return { authUserId };
    } catch (error) {
      try {
        await this.deleteUser(accessToken, authUserId);
      } catch {
        // Preserve the original provisioning error; callers already fail closed.
      }
      throw error;
    }
  }

  async syncUser(input: KeycloakSyncUserInput): Promise<void> {
    const accessToken = await this.getAccessToken();
    await this.syncUserWithAccessToken(accessToken, input);
  }

  async deleteProvisionedUser(authUserId: string): Promise<void> {
    const accessToken = await this.getAccessToken();
    await this.deleteUser(accessToken, authUserId);
  }

  async findManagedUsersByEmail(
    email: string,
  ): Promise<KeycloakManagedUserRecord[]> {
    const accessToken = await this.getAccessToken();
    return await this.findUsersByEmail(accessToken, email);
  }

  async findManagedUsersByUsername(
    username: string,
  ): Promise<KeycloakManagedUserRecord[]> {
    const accessToken = await this.getAccessToken();
    return await this.findUsersByUsername(accessToken, username);
  }

  private async getAccessToken(): Promise<string> {
    const authMode = this.config.authMode ?? "password";
    const formBody =
      authMode === "client_credentials"
        ? new URLSearchParams({
            client_id: this.config.adminClientId ?? "",
            client_secret: this.config.adminClientSecret ?? "",
            grant_type: "client_credentials",
          })
        : new URLSearchParams({
            client_id: "admin-cli",
            grant_type: "password",
            username: this.config.adminUsername ?? "",
            password: this.config.adminPassword ?? "",
          });

    const response = await this.fetchWithTimeout(
      this.buildUrl(
        `realms/${encodeURIComponent(this.config.adminRealm)}/protocol/openid-connect/token`,
      ),
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
        },
        body: formBody,
      },
      "authenticate against Keycloak admin API",
    );

    const payload = (await response
      .json()
      .catch(() => null)) as KeycloakTokenResponse | null;

    if (!response.ok || !payload?.access_token) {
      throw new KeycloakAdminIdentityError(
        "Unable to authenticate against Keycloak admin API",
        503,
        "IDENTITY_PROVISIONING_UNAVAILABLE",
      );
    }

    return payload.access_token;
  }

  private async createUser(
    accessToken: string,
    input: KeycloakProvisionUserInput,
  ): Promise<string> {
    const response = await this.fetchWithTimeout(
      this.buildUrl(
        `admin/realms/${encodeURIComponent(this.config.appRealm)}/users`,
      ),
      {
        method: "POST",
        headers: this.buildJsonHeaders(accessToken),
        body: JSON.stringify({
          username: input.email,
          email: input.email,
          enabled: true,
          emailVerified: false,
          requiredActions: [...INVITE_REQUIRED_ACTIONS],
          attributes: buildUserAttributes(input),
        }),
      },
      "create Keycloak user",
    );

    if (response.status === 409) {
      const [emailMatches, usernameMatches] = await Promise.all([
        this.findUsersByEmail(accessToken, input.email).catch(() => []),
        this.findUsersByUsername(accessToken, input.email).catch(() => []),
      ]);
      const conflictUsers = dedupeManagedUsers([
        ...emailMatches,
        ...usernameMatches,
      ]);
      const conflictField =
        emailMatches.length > 0
          ? "email"
          : usernameMatches.length > 0
            ? "username"
            : "login";

      throw new KeycloakAdminIdentityError(
        conflictField === "username"
          ? "A Keycloak user with this username already exists"
          : conflictField === "email"
            ? "A Keycloak user with this email already exists"
            : "A Keycloak user with this login already exists",
        409,
        "CONFLICT",
        {
          email: input.email,
          username: input.email,
          conflictField,
          conflictUsers,
        },
      );
    }

    if (!response.ok) {
      throw await this.readIdentityError(
        response,
        "Unable to provision the Keycloak user",
      );
    }

    const location = response.headers.get("location");
    const locationId = location?.split("/").pop()?.trim() ?? "";
    if (locationId) {
      return locationId;
    }

    const fallbackId = await this.findUserIdByEmail(accessToken, input.email);
    if (!fallbackId) {
      throw new KeycloakAdminIdentityError(
        "Keycloak user created without a retrievable identifier",
        502,
        "IDENTITY_PROVISIONING_FAILED",
      );
    }
    return fallbackId;
  }

  private async syncUserWithAccessToken(
    accessToken: string,
    input: KeycloakSyncUserInput,
  ): Promise<void> {
    const user = await this.getUser(accessToken, input.authUserId);
    const nextUser: KeycloakUserRepresentation = {
      ...user,
      enabled: input.enabled,
      attributes: buildUserAttributes(input, user.attributes),
      requiredActions: normalizeRequiredActions(user.requiredActions),
    };

    const managedRoles = await this.getManagedRoleRepresentations(accessToken);
    const currentRoles = await this.getCurrentRoleMappings(
      accessToken,
      input.authUserId,
    );
    const rolesToRemove = managedRoles.filter((role) =>
      currentRoles.some((currentRole) => currentRole.name === role.name),
    );

    await this.updateUserRepresentation(
      accessToken,
      input.authUserId,
      nextUser,
    );

    if (rolesToRemove.length > 0) {
      await this.removeRoleMappings(
        accessToken,
        input.authUserId,
        rolesToRemove,
      );
    }

    const targetRole = managedRoles.find((role) => role.name === input.role);
    if (!targetRole) {
      throw new KeycloakAdminIdentityError(
        "Requested role is missing from Keycloak realm roles",
        500,
        "IDENTITY_PROVISIONING_FAILED",
        { role: input.role },
      );
    }

    await this.addRoleMappings(accessToken, input.authUserId, [targetRole]);
  }

  private async sendInviteEmail(
    accessToken: string,
    authUserId: string,
  ): Promise<void> {
    const response = await this.fetchWithTimeout(
      this.buildUrl(
        `admin/realms/${encodeURIComponent(this.config.appRealm)}/users/${encodeURIComponent(authUserId)}/execute-actions-email`,
      ),
      {
        method: "PUT",
        headers: this.buildJsonHeaders(accessToken),
        body: JSON.stringify([...INVITE_REQUIRED_ACTIONS]),
      },
      "send Keycloak execute-actions email",
    );

    if (!response.ok) {
      throw await this.readIdentityError(
        response,
        "Unable to send the Keycloak account setup email",
      );
    }
  }

  private async getManagedRoleRepresentations(
    accessToken: string,
  ): Promise<KeycloakRoleRepresentation[]> {
    const roles: KeycloakRoleRepresentation[] = [];
    for (const role of MANAGED_ADMIN_USER_ROLES) {
      roles.push(await this.getRealmRole(accessToken, role));
    }
    return roles;
  }

  private async getRealmRole(
    accessToken: string,
    role: ManagedAdminUserRole,
  ): Promise<KeycloakRoleRepresentation> {
    const response = await this.fetchWithTimeout(
      this.buildUrl(
        `admin/realms/${encodeURIComponent(this.config.appRealm)}/roles/${encodeURIComponent(role)}`,
      ),
      {
        method: "GET",
        headers: this.buildJsonHeaders(accessToken),
      },
      "read Keycloak realm role",
    );

    if (!response.ok) {
      throw await this.readIdentityError(
        response,
        "Unable to read the Keycloak realm role",
      );
    }

    return (await response.json()) as KeycloakRoleRepresentation;
  }

  private async getUser(
    accessToken: string,
    authUserId: string,
  ): Promise<KeycloakUserRepresentation> {
    const response = await this.fetchWithTimeout(
      this.buildUrl(
        `admin/realms/${encodeURIComponent(this.config.appRealm)}/users/${encodeURIComponent(authUserId)}`,
      ),
      {
        method: "GET",
        headers: this.buildJsonHeaders(accessToken),
      },
      "read Keycloak user",
    );

    if (response.status === 404) {
      throw new KeycloakAdminIdentityError(
        "Linked Keycloak user was not found",
        404,
        "NOT_FOUND",
        { authUserId },
      );
    }
    if (!response.ok) {
      throw await this.readIdentityError(
        response,
        "Unable to read the Keycloak user",
      );
    }

    return (await response.json()) as KeycloakUserRepresentation;
  }

  private async updateUserRepresentation(
    accessToken: string,
    authUserId: string,
    user: KeycloakUserRepresentation,
  ): Promise<void> {
    const response = await this.fetchWithTimeout(
      this.buildUrl(
        `admin/realms/${encodeURIComponent(this.config.appRealm)}/users/${encodeURIComponent(authUserId)}`,
      ),
      {
        method: "PUT",
        headers: this.buildJsonHeaders(accessToken),
        body: JSON.stringify(user),
      },
      "update Keycloak user",
    );

    if (!response.ok) {
      throw await this.readIdentityError(
        response,
        "Unable to update the Keycloak user",
      );
    }
  }

  private async getCurrentRoleMappings(
    accessToken: string,
    authUserId: string,
  ): Promise<KeycloakRoleRepresentation[]> {
    const response = await this.fetchWithTimeout(
      this.buildUrl(
        `admin/realms/${encodeURIComponent(this.config.appRealm)}/users/${encodeURIComponent(authUserId)}/role-mappings/realm`,
      ),
      {
        method: "GET",
        headers: this.buildJsonHeaders(accessToken),
      },
      "read Keycloak user role mappings",
    );

    if (!response.ok) {
      throw await this.readIdentityError(
        response,
        "Unable to read Keycloak role mappings",
      );
    }

    return (await response.json()) as KeycloakRoleRepresentation[];
  }

  private async addRoleMappings(
    accessToken: string,
    authUserId: string,
    roles: KeycloakRoleRepresentation[],
  ): Promise<void> {
    const response = await this.fetchWithTimeout(
      this.buildUrl(
        `admin/realms/${encodeURIComponent(this.config.appRealm)}/users/${encodeURIComponent(authUserId)}/role-mappings/realm`,
      ),
      {
        method: "POST",
        headers: this.buildJsonHeaders(accessToken),
        body: JSON.stringify(roles),
      },
      "add Keycloak role mappings",
    );

    if (!response.ok) {
      throw await this.readIdentityError(
        response,
        "Unable to assign the Keycloak role",
      );
    }
  }

  private async removeRoleMappings(
    accessToken: string,
    authUserId: string,
    roles: KeycloakRoleRepresentation[],
  ): Promise<void> {
    const response = await this.fetchWithTimeout(
      this.buildUrl(
        `admin/realms/${encodeURIComponent(this.config.appRealm)}/users/${encodeURIComponent(authUserId)}/role-mappings/realm`,
      ),
      {
        method: "DELETE",
        headers: this.buildJsonHeaders(accessToken),
        body: JSON.stringify(roles),
      },
      "remove Keycloak role mappings",
    );

    if (!response.ok) {
      throw await this.readIdentityError(
        response,
        "Unable to clear previous Keycloak roles",
      );
    }
  }

  private async deleteUser(
    accessToken: string,
    authUserId: string,
  ): Promise<void> {
    const response = await this.fetchWithTimeout(
      this.buildUrl(
        `admin/realms/${encodeURIComponent(this.config.appRealm)}/users/${encodeURIComponent(authUserId)}`,
      ),
      {
        method: "DELETE",
        headers: this.buildJsonHeaders(accessToken),
      },
      "delete Keycloak user",
    );

    if (response.status === 404) {
      return;
    }
    if (!response.ok) {
      throw await this.readIdentityError(
        response,
        "Unable to delete the Keycloak user",
      );
    }
  }

  private async findUserIdByEmail(
    accessToken: string,
    email: string,
  ): Promise<string | null> {
    const users = await this.findUsersByEmail(accessToken, email);
    return users[0]?.authUserId ?? null;
  }

  private async findUsersByEmail(
    accessToken: string,
    email: string,
  ): Promise<KeycloakManagedUserRecord[]> {
    return await this.findUsersByQuery(accessToken, "email", email);
  }

  private async findUsersByUsername(
    accessToken: string,
    username: string,
  ): Promise<KeycloakManagedUserRecord[]> {
    return await this.findUsersByQuery(accessToken, "username", username);
  }

  private async findUsersByQuery(
    accessToken: string,
    key: "email" | "username",
    value: string,
  ): Promise<KeycloakManagedUserRecord[]> {
    const url = this.buildUrl(
      `admin/realms/${encodeURIComponent(this.config.appRealm)}/users`,
    );
    url.searchParams.set(key, value);
    url.searchParams.set("exact", "true");

    const response = await this.fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: this.buildJsonHeaders(accessToken),
      },
      "search Keycloak user by email",
    );

    if (!response.ok) {
      throw await this.readIdentityError(
        response,
        "Unable to read Keycloak users by email",
      );
    }

    const users = (await response.json()) as KeycloakUserRepresentation[];
    const exactValue = value.trim().toLowerCase();
    return users
      .filter((user) =>
        key === "email"
          ? (user.email ?? "").trim().toLowerCase() === exactValue
          : (user.username ?? "").trim().toLowerCase() === exactValue,
      )
      .map(mapManagedUserRecord)
      .filter((user): user is KeycloakManagedUserRecord => user != null);
  }

  private buildJsonHeaders(accessToken: string): Record<string, string> {
    return {
      authorization: `Bearer ${accessToken}`,
      accept: "application/json",
      "content-type": "application/json",
    };
  }

  private buildUrl(relativePath: string): URL {
    return new URL(relativePath.replace(/^\/+/, ""), `${this.config.baseUrl}/`);
  }

  private async fetchWithTimeout(
    url: URL,
    init: RequestInit,
    action: string,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      KEYCLOAK_REQUEST_TIMEOUT_MS,
    );

    try {
      return await fetch(url, {
        ...init,
        redirect: "error",
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new KeycloakAdminIdentityError(
          `Keycloak request timed out while trying to ${action}`,
          504,
          "IDENTITY_PROVISIONING_TIMEOUT",
        );
      }

      throw new KeycloakAdminIdentityError(
        `Keycloak is unavailable while trying to ${action}`,
        503,
        "IDENTITY_PROVISIONING_UNAVAILABLE",
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async readIdentityError(
    response: Response,
    fallbackMessage: string,
  ): Promise<KeycloakAdminIdentityError> {
    const payload = await response.json().catch(() => null);
    const rawMessage = extractErrorMessage(payload) ?? fallbackMessage;
    if (isMissingRealmEmailSenderError(rawMessage)) {
      return new KeycloakAdminIdentityError(
        "Keycloak realm email sender is not configured. Set smtpServer.from before sending execute-actions-email.",
        503,
        "IDENTITY_EMAIL_NOT_CONFIGURED",
        { cause: rawMessage },
      );
    }

    const message = rawMessage;
    const code =
      response.status === 404
        ? "NOT_FOUND"
        : response.status === 409
          ? "CONFLICT"
          : response.status >= 500
            ? "IDENTITY_PROVISIONING_UNAVAILABLE"
            : "IDENTITY_PROVISIONING_FAILED";

    return new KeycloakAdminIdentityError(message, response.status, code);
  }
}

export function getKeycloakAdminIdentityServiceFromEnv(
  env: NodeJS.ProcessEnv,
): KeycloakAdminIdentityService | null {
  const issuerUrl = env["AUTH_ISSUER_URL"]?.trim() ?? "";
  const configuredMode = env["KEYCLOAK_ADMIN_AUTH_MODE"]?.trim() ?? "";
  const adminUsername = env["KEYCLOAK_ADMIN_USERNAME"]?.trim() ?? "";
  const adminPassword = env["KEYCLOAK_ADMIN_PASSWORD"]?.trim() ?? "";
  const adminClientId = env["KEYCLOAK_ADMIN_CLIENT_ID"]?.trim() ?? "";
  const adminClientSecret = env["KEYCLOAK_ADMIN_CLIENT_SECRET"]?.trim() ?? "";

  if (!issuerUrl) {
    return null;
  }

  const hasPasswordGrant = adminUsername.length > 0 && adminPassword.length > 0;
  const hasClientCredentials =
    adminClientId.length > 0 && adminClientSecret.length > 0;

  const authMode =
    configuredMode === "client_credentials"
      ? hasClientCredentials
        ? "client_credentials"
        : null
      : configuredMode === "password"
        ? hasPasswordGrant
          ? "password"
          : null
        : hasClientCredentials
          ? "client_credentials"
          : hasPasswordGrant
            ? "password"
            : null;

  if (!authMode) {
    return null;
  }

  const { appRealm, baseUrl } = extractRealmFromIssuer(issuerUrl);

  return new KeycloakAdminIdentityService({
    adminRealm: env["KEYCLOAK_ADMIN_REALM"]?.trim() || "master",
    appRealm,
    baseUrl,
    authMode,
    adminUsername,
    adminPassword,
    adminClientId,
    adminClientSecret,
  });
}
