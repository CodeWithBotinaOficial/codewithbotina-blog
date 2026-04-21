export function pickLinkedPostImageUrl(
  posts: Array<{ imagen_url?: string | null }>,
): string {
  for (const post of posts) {
    const url = String(post?.imagen_url ?? "").trim();
    if (url) return url;
  }
  return "";
}

