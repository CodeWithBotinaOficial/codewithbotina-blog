import { Handlers } from "$fresh/server.ts";
import { supabase } from "../../../lib/supabase.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { requireAdmin } from "../../../middleware/auth.ts";
import { AppError, ValidationError } from "../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";

const BUCKET = "blog-images";
const DEFAULT_LIMIT = 48;
const MAX_LIMIT = 100;

type StorageListItem = {
  name?: unknown;
  metadata?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

function isImageFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".webp") || lower.endsWith(".png") ||
    lower.endsWith(".jpg") || lower.endsWith(".jpeg") ||
    lower.endsWith(".gif");
}

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  },

  async GET(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

    try {
      await requireAdmin(req);

      const limit = Math.min(
        Math.max(
          Number.parseInt(limitParam ?? `${DEFAULT_LIMIT}`, 10) ||
            DEFAULT_LIMIT,
          1,
        ),
        MAX_LIMIT,
      );
      const offset = Math.max(Number.parseInt(offsetParam ?? "0", 10) || 0, 0);

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list("", {
          limit,
          offset,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) {
        console.error("Supabase storage error:", error);
        throw new AppError("Failed to list storage images", 500);
      }

      const items = ((data ?? []) as StorageListItem[])
        .filter((item): item is StorageListItem & { name: string } =>
          Boolean(item) && typeof item.name === "string"
        )
        .filter((item) => isImageFilename(item.name))
        .filter((item) => (q ? item.name.toLowerCase().includes(q) : true))
        .map((item) => {
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(
            item.name,
          );
          const metadata = (item.metadata && typeof item.metadata === "object")
            ? item.metadata as Record<string, unknown>
            : {};
          return {
            name: item.name,
            url: urlData.publicUrl,
            size: typeof metadata.size === "number" ? metadata.size : null,
            mimetype: typeof metadata.mimetype === "string"
              ? metadata.mimetype
              : null,
            created_at: typeof item.created_at === "string"
              ? item.created_at
              : null,
            updated_at: typeof item.updated_at === "string"
              ? item.updated_at
              : null,
          };
        });

      const response = successResponse(
        {
          bucket: BUCKET,
          images: items,
          limit,
          offset,
          next_offset: offset + limit,
          has_more: (data ?? []).length === limit,
        },
        "Images fetched successfully",
        200,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const statusCode = error instanceof AppError
        ? error.statusCode
        : error instanceof ValidationError
        ? 400
        : 500;
      const response = errorResponse(
        error instanceof Error ? error.message : "Internal server error",
        statusCode,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};
