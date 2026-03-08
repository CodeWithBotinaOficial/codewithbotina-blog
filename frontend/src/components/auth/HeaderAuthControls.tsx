import { useAuth } from "../../hooks/useAuth";
import { useSession } from "../../hooks/useSession";

interface Props {
  labels: {
    signIn: string;
    signOut: string;
    loading: string;
  };
}

export default function HeaderAuthControls({ labels }: Props) {
  const { user, loading } = useSession();
  const { signIn, signOut } = useAuth();

  if (loading) {
    return <div class="auth-loading">{labels.loading}</div>;
  }

  if (!user) {
    return (
      <div class="auth-controls">
        <button class="btn-auth" type="button" onClick={signIn}>
          {labels.signIn}
        </button>
      </div>
    );
  }

  return (
    <div class="auth-controls">
      <div class="auth-avatar" title={user.full_name || user.email}>
        <img
          src={user.avatar_url || "/avatar-placeholder.png"}
          alt={user.full_name || "User"}
          width={48}
          height={48}
          class="avatar-img"
        />
        {user.is_admin ? <span class="admin-dot">A</span> : null}
      </div>
      <span class="auth-name">{user.full_name || user.email}</span>
      <button class="btn-auth" type="button" onClick={signOut}>
        {labels.signOut}
      </button>
    </div>
  );
}
