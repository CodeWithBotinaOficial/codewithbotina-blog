import { getApiUrl } from "../lib/env";

const API_URL = getApiUrl();

export async function requireAuth(): Promise<boolean> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    credentials: "include",
  });
  if (!response.ok) {
    window.location.href = "/auth/signin";
    return false;
  }
  return true;
}
