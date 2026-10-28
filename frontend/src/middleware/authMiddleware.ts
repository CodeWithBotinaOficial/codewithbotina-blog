import { apiCall } from "../lib/api";
import { getAuthRoute } from "../lib/auth-endpoints";

export async function requireAuth(): Promise<boolean> {
  const response = await apiCall(getAuthRoute("/me"), {
    credentials: "include",
  });
  if (!response.ok) {
    window.location.href = "/auth/signin";
    return false;
  }
  return true;
}
