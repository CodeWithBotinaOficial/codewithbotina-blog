import { apiFetch } from "./api";

export function generateSlug(text: string): string {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function cleanSlugInput(value: string): string {
  return generateSlug(String(value ?? "").replace(/-/g, " "));
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3;
}

export async function checkSlugAvailability(
  slug: string,
  language: string,
  excludeId?: string,
): Promise<boolean> {
  const query = new URLSearchParams({ lang: language || "en" });
  if (excludeId) query.set("excludeId", excludeId);
  const payload = await apiFetch<{ exists?: boolean }>(
    `/api/polls/${encodeURIComponent(slug)}/exists?${query.toString()}`,
  );
  return !payload?.exists;
}
