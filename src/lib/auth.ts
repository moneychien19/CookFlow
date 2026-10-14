import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { withoutProviderTokens } from "@/lib/auth-privacy";
import { getDb } from "@/lib/db/client";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

/**
 * Auth.js with GitHub and Google, database sessions in our own tables.
 * Provider credentials come from AUTH_GITHUB_ID/SECRET and AUTH_GOOGLE_ID/SECRET,
 * the session secret from AUTH_SECRET. Lazy, so nothing connects at build time.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const adapter = DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  });
  return {
    adapter: {
      ...adapter,
      linkAccount: (account) => adapter.linkAccount?.(withoutProviderTokens(account)),
    },
    // Only name and email from the profile (SPEC §7a #8): no avatar.
    providers: [
      GitHub({ profile: (p) => ({ id: String(p.id), name: p.name ?? p.login, email: p.email }) }),
      Google({ profile: (p) => ({ id: p.sub, name: p.name, email: p.email }) }),
    ],
    session: { strategy: "database" },
    callbacks: {
      session({ session, user }) {
        session.user.id = user.id;
        return session;
      },
    },
  };
});
