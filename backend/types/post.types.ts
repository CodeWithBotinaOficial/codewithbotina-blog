export interface PostRecord {
  id: string;
  titulo: string;
  slug: string;
  body: string;
  imagen_url: string | null;
  fecha: string;
  updated_at?: string | null;
  language: PostLanguage;
}

export type PostLanguage = "en" | "es" | "fr" | "de" | "pt" | "ja" | "zh";

export interface PostCreate {
  titulo: string;
  slug: string;
  body: string;
  imagen_url?: string | null;
  tag_ids?: string[];
  language?: PostLanguage;
}

export interface PostUpdate {
  titulo: string;
  slug: string;
  body: string;
  imagen_url?: string | null;
  tag_ids?: string[];
  language?: PostLanguage;
}

export interface PostCreateBatchRequest {
  posts: PostCreate[];
}

export interface PostCreateBatchResponse {
  posts: PostRecord[];
  translation_group_id: string | null;
}

export interface BulkPostUpdateItem {
  post_id: string;
  post: PostUpdate;
  tag_ids?: string[]; // overrides post.tag_ids when provided
}

export interface BulkPostCreateTranslationItem {
  base_post_id: string;
  post: PostCreate;
}

export interface BulkPostUnlinkTranslationItem {
  post_id: string;
  linked_post_id: string;
}

export interface BulkPostUpdateRequest {
  updates?: BulkPostUpdateItem[];
  creates?: BulkPostCreateTranslationItem[];
  unlinks?: BulkPostUnlinkTranslationItem[];
}

export interface BulkPostUpdateResponse {
  updated_post_ids: string[];
  created_post_ids: string[];
  unlinked_post_ids: string[];
  translation_group_id_by_base_post_id: Record<string, string | null>;
}

export interface DeleteResult {
  post_id: string;
  comments_deleted: number;
  reactions_deleted: number;
  image_deleted: boolean;
}

export interface DeleteInfo {
  post_id: string;
  titulo: string;
  comments_count: number;
  reactions_count: number;
  likes_count: number;
  dislikes_count: number;
  imagen_url: string | null;
}
