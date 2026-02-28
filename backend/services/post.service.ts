import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import { supabase } from "../lib/supabase.ts";
import { sanitizeInput } from "../lib/validation.ts";
import { ServiceResult } from "../types/api.types.ts";
import { DeleteInfo, DeleteResult, PostCreate, PostRecord, PostUpdate } from "../types/post.types.ts";
import { AppError, DatabaseError, ValidationError } from "../utils/errors.ts";
import { AuthService } from "./auth.service.ts";
import { ImageService } from "./image.service.ts";

export class PostService {
  private authService: AuthService;
  private imageService: ImageService;

  constructor(
    authService: AuthService = new AuthService(),
    imageService: ImageService = new ImageService(),
  ) {
    this.authService = authService;
    this.imageService = imageService;
  }

  async createPost(
    data: PostCreate,
    userId: string,
  ): Promise<ServiceResult<PostRecord>> {
    try {
      const isAdmin = await this.authService.isAdmin(userId);
      if (!isAdmin) {
        return { success: false, error: new AppError("Forbidden", 403) };
      }

      const sanitized = this.validateAndSanitize(data);
      const unique = await this.isSlugUnique(sanitized.slug);
      if (!unique) {
        return {
          success: false,
          error: new ValidationError("Slug already exists"),
        };
      }

      const { data: created, error } = await supabase
        .from("posts")
        .insert([{
          titulo: sanitized.titulo,
          slug: sanitized.slug,
          body: sanitized.body,
          imagen_url: sanitized.imagen_url ?? null,
          fecha: new Date().toISOString(),
        }])
        .select("id, titulo, slug, body, imagen_url, fecha, updated_at")
        .single();

      if (error || !created) {
        console.error("Supabase error:", error);
        throw new DatabaseError("Failed to create post");
      }

      return { success: true, data: created as PostRecord };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  async updatePost(
    slug: string,
    data: PostUpdate,
    userId: string,
  ): Promise<ServiceResult<PostRecord>> {
    try {
      const isAdmin = await this.authService.isAdmin(userId);
      if (!isAdmin) {
        return { success: false, error: new AppError("Forbidden", 403) };
      }

      const existing = await this.getPostBySlug(slug);
      if (!existing) {
        return { success: false, error: new AppError("Post not found", 404) };
      }

      const sanitized = this.validateAndSanitize(data);
      if (sanitized.slug !== existing.slug) {
        const unique = await this.isSlugUnique(sanitized.slug, existing.id);
        if (!unique) {
          return {
            success: false,
            error: new ValidationError("Slug already exists"),
          };
        }
      }

      const { data: updated, error } = await supabase
        .from("posts")
        .update({
          titulo: sanitized.titulo,
          slug: sanitized.slug,
          body: sanitized.body,
          imagen_url: sanitized.imagen_url ?? null,
        })
        .eq("id", existing.id)
        .select("id, titulo, slug, body, imagen_url, fecha, updated_at")
        .single();

      if (error || !updated) {
        console.error("Supabase error:", error);
        throw new DatabaseError("Failed to update post");
      }

      return { success: true, data: updated as PostRecord };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  async deletePost(
    slug: string,
    userId: string,
  ): Promise<ServiceResult<DeleteResult>> {
    try {
      const isAdmin = await this.authService.isAdmin(userId);
      if (!isAdmin) {
        return { success: false, error: new AppError("Forbidden", 403) };
      }

      const existing = await this.getPostBySlug(slug);
      if (!existing) {
        return { success: false, error: new AppError("Post not found", 404) };
      }

      const info = await this.getDeleteInfo(slug);

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", existing.id);

      if (error) {
        console.error("Supabase error:", error);
        throw new DatabaseError("Failed to delete post");
      }

      let imageDeleted = false;
      if (existing.imagen_url) {
        const filename = this.imageService.getFilenameFromUrl(existing.imagen_url);
        if (filename) {
          imageDeleted = await this.imageService.deleteImage(filename);
        }
      }

      return {
        success: true,
        data: {
          post_id: existing.id,
          comments_deleted: info.comments_count,
          reactions_deleted: info.reactions_count,
          image_deleted: imageDeleted,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  async getDeleteInfo(slug: string): Promise<DeleteInfo> {
    const post = await this.getPostBySlug(slug);
    if (!post) {
      throw new AppError("Post not found", 404);
    }

    const { count: commentCount, error: commentError } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", post.id);

    if (commentError) {
      console.error("Supabase error:", commentError);
      throw new DatabaseError("Failed to fetch comment count");
    }

    const { data: reactions, error: reactionError } = await supabase
      .from("post_reactions")
      .select("reaction_type")
      .eq("post_id", post.id);

    if (reactionError) {
      console.error("Supabase error:", reactionError);
      throw new DatabaseError("Failed to fetch reaction count");
    }

    const likesCount = (reactions ?? []).filter((reaction) =>
      reaction.reaction_type === "like"
    ).length;
    const dislikesCount = (reactions ?? []).filter((reaction) =>
      reaction.reaction_type === "dislike"
    ).length;
    const reactionCount = likesCount + dislikesCount;

    return {
      post_id: post.id,
      titulo: post.titulo,
      comments_count: commentCount ?? 0,
      reactions_count: reactionCount ?? 0,
      likes_count: likesCount,
      dislikes_count: dislikesCount,
      imagen_url: post.imagen_url ?? null,
    };
  }

  async isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from("posts")
      .select("id")
      .eq("slug", slug);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to check slug uniqueness");
    }

    return !data;
  }

  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  sanitizeMarkdown(content: string): string {
    const html = marked.parse(content) as string;
    DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "blockquote",
        "code",
        "pre",
        "a",
        "img",
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "title", "class"],
    });

    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  }

  private validateAndSanitize(data: PostCreate | PostUpdate): PostCreate {
    const errors: Record<string, string> = {};

    const titulo = sanitizeInput(data.titulo ?? "");
    if (!titulo || titulo.length < 1) {
      errors.titulo = "Title is required";
    } else if (titulo.length > 200) {
      errors.titulo = "Title must be less than 200 characters";
    }

    const baseSlug = data.slug ? data.slug : this.generateSlug(titulo);
    const slug = this.generateSlug(baseSlug);
    if (!slug) {
      errors.slug = "Slug is required";
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      errors.slug = "Slug must be lowercase letters, numbers, and hyphens only";
    }

    const bodyRaw = data.body ?? "";
    const body = this.sanitizeMarkdown(bodyRaw.trim());
    if (!body || body.length < 100) {
      errors.body = "Content must be at least 100 characters";
    } else if (body.length > 50000) {
      errors.body = "Content must be less than 50,000 characters";
    }

    let imagen_url: string | null = null;
    if (typeof data.imagen_url === "string" && data.imagen_url.trim() !== "") {
      try {
        const parsed = new URL(data.imagen_url.trim());
        imagen_url = parsed.toString();
      } catch (_error) {
        errors.imagen_url = "Image URL must be a valid URL";
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(
        Object.values(errors)[0] || "Invalid post data",
      );
    }

    return {
      titulo,
      slug,
      body,
      imagen_url,
    };
  }

  private async getPostBySlug(slug: string): Promise<PostRecord | null> {
    const { data, error } = await supabase
      .from("posts")
      .select("id, titulo, slug, body, imagen_url, fecha, updated_at")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to fetch post");
    }

    return data as PostRecord | null;
  }
}
