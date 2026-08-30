import { timingSafeEqual } from "node:crypto";

export function requireAgentSecret() {
  const secret = process.env.CARELY_AGENT_SECRET;
  if (!secret) throw new Error("CARELY_AGENT_SECRET is required for agent actions.");
  return secret;
}

export function isAgentAuthorized(authorization: string | null) {
  const expected = Buffer.from(`Bearer ${requireAgentSecret()}`);
  const received = Buffer.from(authorization ?? "");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
