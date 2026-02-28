interface PkceSession {
  verifier: string;
  createdAt: number;
}

const PKCE_TTL_MS = 10 * 60 * 1000;
const pkceStore = new Map<string, PkceSession>();
let cleanupTimer: number | null = null;

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [key, session] of pkceStore.entries()) {
    if (now - session.createdAt > PKCE_TTL_MS) {
      pkceStore.delete(key);
    }
  }
}

function shouldStartCleanup(): boolean {
  return !Deno.args.includes("build");
}

function startCleanup() {
  if (cleanupTimer !== null) return;
  cleanupTimer = setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
}

if (shouldStartCleanup()) {
  startCleanup();
}

export function storePkceSession(id: string, verifier: string) {
  pkceStore.set(id, { verifier, createdAt: Date.now() });
}

export function takePkceSession(id: string): string | null {
  const session = pkceStore.get(id);
  if (!session) return null;
  pkceStore.delete(id);
  return session.verifier;
}
