/**
 * Simple in‑memory rate limiter for login attempts.
 * - 5 attempts per 15 minutes per username (kept in memory only).
 * - For production you should persist attempts in a DB or Redis.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

type Attempt = {
  timestamp: number;
  ip: string;
};

// Map<username, Map<ip, Attempt[]>>
const attempts = new Map<string, Map<string, Attempt[]>>();

export function recordAttempt(username: string, ip: string): void {
  const userMap = attempts.get(username) ?? new Map<string, Attempt[]>();
  const ipAttempts = userMap.get(ip) ?? [];
  const now = Date.now();

  // Keep only attempts within the last window
  const recent = ipAttempts.filter((a) => now - a.timestamp < WINDOW_MINUTES * 60 * 1000);
  recent.push({ timestamp: now, ip });
  userMap.set(ip, recent);
  attempts.set(username, userMap);
}

export function isLoginAllowed(username: string, ip: string): boolean {
  const userMap = attempts.get(username) ?? new Map<string, Attempt[]>();
  const ipAttempts = userMap.get(ip) ?? [];
  const now = Date.now();
  const recent = ipAttempts.filter((a) => now - a.timestamp < WINDOW_MINUTES * 60 * 1000);
  userMap.set(ip, recent);
  attempts.set(username, userMap);

  return recent.length < MAX_ATTEMPTS;
}

export function clearAttempts(username: string, ip: string): void {
  const userMap = attempts.get(username);
  if (userMap) {
    userMap.delete(ip);
    if (userMap.size === 0) attempts.delete(username);
  }
}
