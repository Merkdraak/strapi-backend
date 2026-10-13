export type EditorLock = {
  siteKey: string;
  documentId: string;
  userId: string;
  userName: string;
  updatedAt: number;
};

export type EditorLockPublic = {
  userId: string;
  userName: string;
  mine: boolean;
};

/** Without heartbeat, lock expires and others can open the page again. */
const LOCK_TTL_MS = 90_000;

const locks = new Map<string, EditorLock>();

function keyOf(siteKey: string, documentId: string) {
  return `${siteKey}::${documentId}`;
}

function purgeExpired(now = Date.now()) {
  for (const [key, lock] of locks) {
    if (now - lock.updatedAt > LOCK_TTL_MS) locks.delete(key);
  }
}

export function adminDisplayName(user: {
  id?: number | string;
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
} | null | undefined) {
  if (!user) return "Iemand";
  const full = [user.firstname, user.lastname].map((part) => String(part ?? "").trim()).filter(Boolean).join(" ");
  if (full) return full;
  const username = String(user.username ?? "").trim();
  if (username) return username;
  const email = String(user.email ?? "").trim();
  if (email) return email.split("@")[0] || email;
  return "Iemand";
}

export function adminUserId(user: { id?: number | string } | null | undefined) {
  const id = user?.id;
  return id == null || id === "" ? "" : String(id);
}

export function getEditorLock(siteKey: string, documentId: string): EditorLock | null {
  purgeExpired();
  if (!siteKey || !documentId) return null;
  return locks.get(keyOf(siteKey, documentId)) ?? null;
}

export function listEditorLocks(siteKey: string, viewerId = ""): Record<string, EditorLockPublic> {
  purgeExpired();
  const out: Record<string, EditorLockPublic> = {};
  if (!siteKey) return out;
  for (const lock of locks.values()) {
    if (lock.siteKey !== siteKey) continue;
    out[lock.documentId] = {
      userId: lock.userId,
      userName: lock.userName,
      mine: Boolean(viewerId) && lock.userId === viewerId,
    };
  }
  return out;
}

export function acquireEditorLock(input: {
  siteKey: string;
  documentId: string;
  userId: string;
  userName: string;
}): { ok: true; lock: EditorLock } | { ok: false; lock: EditorLock } {
  purgeExpired();
  const { siteKey, documentId, userId, userName } = input;
  if (!siteKey || !documentId || !userId) {
    return {
      ok: false,
      lock: {
        siteKey,
        documentId,
        userId: "",
        userName: "Onbekend",
        updatedAt: Date.now(),
      },
    };
  }
  const key = keyOf(siteKey, documentId);
  const existing = locks.get(key);
  if (existing && existing.userId !== userId) {
    return { ok: false, lock: existing };
  }
  const lock: EditorLock = {
    siteKey,
    documentId,
    userId,
    userName: userName || "Iemand",
    updatedAt: Date.now(),
  };
  locks.set(key, lock);
  return { ok: true, lock };
}

export function heartbeatEditorLock(input: {
  siteKey: string;
  documentId: string;
  userId: string;
  userName: string;
}) {
  return acquireEditorLock(input);
}

export function releaseEditorLock(input: { siteKey: string; documentId: string; userId: string }) {
  purgeExpired();
  const key = keyOf(input.siteKey, input.documentId);
  const existing = locks.get(key);
  if (!existing) return { ok: true as const, released: false };
  if (existing.userId !== input.userId) return { ok: false as const, released: false, lock: existing };
  locks.delete(key);
  return { ok: true as const, released: true };
}

/** Parse page/case documentId from editor next path. */
export function documentIdFromEditorNext(next: string) {
  const path = String(next ?? "").split("?")[0];
  if (!path.startsWith("/editor")) return "";
  if (path === "/editor" || path === "/editor/" || path === "/editor/nieuw" || path === "/editor/cases/nieuw") {
    return "";
  }
  const caseMatch = path.match(/^\/editor\/cases\/([^/]+)$/);
  if (caseMatch?.[1]) return decodeURIComponent(caseMatch[1]);
  const pageMatch = path.match(/^\/editor\/([^/]+)$/);
  if (pageMatch?.[1] && pageMatch[1] !== "cases") return decodeURIComponent(pageMatch[1]);
  return "";
}
