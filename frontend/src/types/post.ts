export interface Post {
  id: string;
  titulo: string;
  slug: string;
  body: string;
  imagen_url?: string;
  fecha: string;
  tags?: string[];
  excerpt?: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}
