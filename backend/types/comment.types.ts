export interface CommentUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  user?: CommentUser | null;
}

export interface CommentInsert {
  post_id: string;
  user_id: string;
  content: string;
  is_pinned?: boolean;
}
