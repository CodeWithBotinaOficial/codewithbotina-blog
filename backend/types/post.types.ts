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
