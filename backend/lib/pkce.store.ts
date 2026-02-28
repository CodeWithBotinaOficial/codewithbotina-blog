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

export function storePkceSession(state: string, verifier: string) {
  pkceStore.set(state, { verifier, createdAt: Date.now() });
}

export function takePkceSession(state: string): string | null {
  const session = pkceStore.get(state);
  if (!session) return null;
  pkceStore.delete(state);
  return session.verifier;
}
