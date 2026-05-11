export type Language = "es" | "en" | "pt-br";

export interface Post {
  id: string;
  titulo: string;
  slug: string;
  body: string;
  imagen_url?: string;
  fecha: string;
  tags?: string[];
  excerpt?: string;
  language?: Language;
}

export interface PostTranslations {
  es?: Post;
  en?: Post;
  "pt-br"?: Post;
}

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}
