/**
 * Offline outbox — sale/stock/purchase entries localStorage me queue,
 * network aate hi sync. Chhota, dependency-free.
 */
export type OutboxKind = "sale" | "stock" | "purchase";

export type OutboxEntry = {
  id: string;
  kind: OutboxKind;
  label: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

const KEY = "naseeb-outbox-v1";

function readAll(): OutboxEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(entries: OutboxEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent("naseeb:outbox", { detail: { count: entries.length } }));
}

export function outboxCount(): number {
  return readAll().length;
}

export function enqueueOutbox(kind: OutboxKind, label: string, payload: Record<string, unknown>): string {
  const entry: OutboxEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    label,
    createdAt: new Date().toISOString(),
    payload,
  };
  const all = readAll();
  all.push(entry);
  writeAll(all);
  return entry.id;
}

export function listOutbox(): OutboxEntry[] {
  return readAll();
}

export function removeOutbox(id: string) {
  writeAll(readAll().filter((e) => e.id !== id));
}

export function clearOutbox() {
  writeAll([]);
}
