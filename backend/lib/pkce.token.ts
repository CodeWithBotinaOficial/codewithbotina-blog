import { decodeBase64Url, encodeBase64Url } from "$std/encoding/base64url.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const PKCE_TOKEN_TTL_MS = 10 * 60 * 1000;

function getSessionSecret(): string {
  return Deno.env.get("SESSION_SECRET") || "development-session-secret";
}

async function getCryptoKey(): Promise<CryptoKey> {
  const secret = getSessionSecret();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function createPkceToken(verifier: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = JSON.stringify({
    verifier,
    exp: Date.now() + PKCE_TOKEN_TTL_MS,
  });
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(payload),
  );

  const tokenPayload = new Uint8Array(iv.length + encrypted.byteLength);
  tokenPayload.set(iv, 0);
  tokenPayload.set(new Uint8Array(encrypted), iv.length);
  return encodeBase64Url(tokenPayload);
}

export async function readPkceToken(token: string): Promise<string | null> {
  if (!token) return null;

  try {
    const raw = decodeBase64Url(token);
    if (raw.length <= 12) return null;

    const iv = raw.slice(0, 12);
    const ciphertext = raw.slice(12);
    const key = await getCryptoKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );
    const payload = JSON.parse(decoder.decode(decrypted)) as {
      verifier?: string;
      exp?: number;
    };

    if (!payload.verifier || !payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload.verifier;
  } catch (_error) {
    return null;
  }
}
