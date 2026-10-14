import type { AdapterAccount } from "next-auth/adapters";

/**
 * SPEC §7a #8: OAuth stores only the provider account id, name, and email.
 * CookFlow never calls the provider's API, so its tokens aren't kept.
 */
export function withoutProviderTokens(account: AdapterAccount): AdapterAccount {
  const { userId, type, provider, providerAccountId } = account;
  return { userId, type, provider, providerAccountId };
}
