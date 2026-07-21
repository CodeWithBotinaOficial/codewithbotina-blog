import { supabase } from "../lib/supabase.ts";
import { AppError, ValidationError } from "../utils/errors.ts";

const VALID_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getImageExtension(type: string): string {
  return EXTENSION_BY_TYPE[type] ?? "bin";
}

export class ImageService {
  async uploadImage(file: File, title: string, slug: string): Promise<{
    url: string;
    filename: string;
    size: number;
  }> {
    if (!VALID_TYPES.includes(file.type)) {
      throw new ValidationError("Invalid file type. Use JPG, PNG, or WebP.");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError("File too large. Max 5MB.");
    }

    const safeTitle = title.trim();
    if (!safeTitle || safeTitle.length > 100) {
      throw new ValidationError("Image title is required (1-100 chars).");
    }

    const imageBytes = new Uint8Array(await file.arrayBuffer());
    const safeSlug = slug
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    const timestamp = Date.now();
    const filename = `${safeSlug}-${timestamp}.${getImageExtension(file.type)}`;

    const { error } = await supabase.storage
      .from("blog-images")
      .upload(filename, imageBytes, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) {
      console.error("Supabase storage error:", error);
      throw new AppError("Failed to upload image", 500);
    }

    const { data } = supabase.storage
      .from("blog-images")
      .getPublicUrl(filename);

    return {
      url: data.publicUrl,
      filename,
      size: imageBytes.byteLength,
    };
  }

  async deleteImage(filename: string): Promise<boolean> {
    if (!filename) return false;

    const { error } = await supabase.storage
      .from("blog-images")
      .remove([filename]);

    if (error) {
      console.error("Supabase storage error:", error);
      throw new AppError("Failed to delete image", 500);
    }

    return true;
  }

  getFilenameFromUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      const marker = "/storage/v1/object/public/blog-images/";
      const index = parsed.pathname.indexOf(marker);
      if (index === -1) return null;
      return parsed.pathname.slice(index + marker.length);
    } catch (_error) {
      return null;
    }
  }
}
