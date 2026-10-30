export type Language =
  | "es"
  | "en"
  | "pt-br"
  | "fr"
  | "de"
  | "pt"
  | "ja"
  | "zh";

export interface PostListItem {
  id: string;
  titulo: string;
  slug: string;
  imagen_url: string | null;
  fecha: string | null;
  language: Language;
  is_pinned?: boolean;
  status?: "draft" | "scheduled" | "published";
  scheduled_at?: string | null;
  updated_at?: string | null;
}

export interface PostDetail extends PostListItem {
  body: string | null;
  tags?: string[];
  excerpt?: string;
}

export type Post = PostDetail;

export interface PostTranslations {
  es?: PostDetail;
  en?: PostDetail;
  "pt-br"?: PostDetail;
}

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}
