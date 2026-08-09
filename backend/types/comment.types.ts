export interface CommentUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Comment {
  id: string;
  post_id: string;
  translation_group_id?: string | null;
  parent_id?: string | null;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  user?: CommentUser | null;
}

export interface CommentWithLanguage extends Comment {
  translation_group_id: string | null;
  parent_id: string | null;
  post_language: string;
  post_slug: string;
  post_title: string;
  replies?: CommentWithLanguage[];
}

export interface CommentInsert {
  post_id: string;
  user_id: string;
  content: string;
  parent_id?: string | null;
  is_pinned?: boolean;
}
