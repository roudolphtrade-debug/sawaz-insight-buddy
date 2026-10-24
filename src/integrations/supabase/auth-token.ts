/** Require a user bearer JWT, never an opaque Supabase API key. */
export function requireUserBearerToken(headers: Headers): string {
  const header = headers.get("authorization");
  if (!header) throw new Error("Unauthorized: No authorization header provided");
  if (!header.startsWith("Bearer ")) {
    throw new Error("Unauthorized: Only Bearer tokens are supported");
  }
  const token = header.slice(7);
  if (!token) throw new Error("Unauthorized: No token provided");
  if (token.split(".").length !== 3 || token.split(".").some((part) => !part)) {
    throw new Error("Unauthorized: Invalid token");
  }
  return token;
}