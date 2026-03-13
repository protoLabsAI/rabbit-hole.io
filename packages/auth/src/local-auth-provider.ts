/**
 * LocalAuthProvider - Simple local authentication provider
 *
 * Returns a fixed local user for development/local use without Clerk.
 */

export interface LocalAuthSession {
  userId: string;
}

export function LocalAuthProvider(): LocalAuthSession {
  return { userId: "local-user" };
}
