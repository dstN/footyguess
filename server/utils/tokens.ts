import { createHmac, randomUUID } from "node:crypto";

const envSecret = process.env.SCORING_SECRET;
if (!envSecret && process.env.NODE_ENV === "production") {
  throw new Error("SCORING_SECRET must be set in production.");
}

const SECRET = envSecret || "dev-secret-change-me";

interface RoundPayload {
  roundId: string;
  playerId: number;
  sessionId: string;
  exp: number;
}

function base64url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(data: string) {
  return base64url(createHmac("sha256", SECRET).update(data).digest("base64"));
}

export function generateSessionId() {
  return randomUUID();
}

export function createRoundToken(payload: RoundPayload) {
  const body = base64url(JSON.stringify(payload));
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifyRoundToken(token: string): RoundPayload {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    throw new Error("Invalid token format");
  }
  const expected = sign(body);
  if (expected !== signature) {
    throw new Error("Invalid token signature");
  }
  const decoded = JSON.parse(Buffer.from(body, "base64").toString("utf8")) as RoundPayload;
  if (!decoded.roundId || !decoded.playerId || !decoded.sessionId || !decoded.exp) {
    throw new Error("Invalid token payload");
  }
  if (decoded.exp < Date.now()) {
    throw new Error("Token expired");
  }
  return decoded;
}
