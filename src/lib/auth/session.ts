import { createHmac, timingSafeEqual } from "node:crypto";

const PAYLOAD = "admin-session";

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET não configurado");
  return secret;
}

export function signSession(): string {
  const signature = createHmac("sha256", getSecret()).update(PAYLOAD).digest("hex");
  return `${PAYLOAD}.${signature}`;
}

export function verifySessionToken(token: string): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (payload !== PAYLOAD || !signature) return false;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return false;
  }

  const expected = createHmac("sha256", secret).update(PAYLOAD).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
