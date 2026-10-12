import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "naseeb_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 din

export type SessionUser = {
  uid: number;
  username: string;
  name: string;
  mustChangePin: boolean;
};

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET environment variable is not defined. Please set it in .env.local.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    username: user.username,
    name: user.name,
    mcp: user.mustChangePin,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.uid))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return {
      uid: Number(payload.sub),
      username: String(payload.username ?? ""),
      name: String(payload.name ?? ""),
      mustChangePin: Boolean(payload.mcp),
    };
  } catch {
    return null;
  }
}
