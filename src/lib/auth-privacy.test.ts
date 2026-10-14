import { describe, expect, it } from "vitest";
import { withoutProviderTokens } from "./auth-privacy";

describe("withoutProviderTokens", () => {
  const account = {
    userId: "user-1",
    type: "oauth" as const,
    provider: "github",
    providerAccountId: "123",
    access_token: "gho_secret",
    refresh_token: "ghr_secret",
    id_token: "eyJ.secret",
    expires_at: 1700000000,
    token_type: "bearer" as const,
    scope: "read:user user:email",
  };

  it("keeps what links the account to the user", () => {
    expect(withoutProviderTokens(account)).toMatchObject({
      userId: "user-1",
      type: "oauth",
      provider: "github",
      providerAccountId: "123",
    });
  });

  it("drops the provider's tokens, which CookFlow never uses", () => {
    const stored = withoutProviderTokens(account);
    for (const key of ["access_token", "refresh_token", "id_token", "expires_at", "token_type", "scope"]) {
      expect(stored).not.toHaveProperty(key);
    }
  });
});
