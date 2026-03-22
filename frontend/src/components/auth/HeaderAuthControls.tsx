import { useAuth } from "../../hooks/useAuth";
import { useSession } from "../../hooks/useSession";

interface Props {
  labels: {
    signIn: string;
    signOut: string;
    loading: string;
  };
  profileHref: string;
}

export default function HeaderAuthControls({ labels, profileHref }: Props) {
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
      <a
        href={profileHref}
        class="auth-avatar cursor-pointer transition-transform hover:scale-[1.03] hover:opacity-90"
        title={user.full_name || user.email}
        aria-label="Open profile"
      >
        <img
          src={user.avatar_url || "/avatar-placeholder.png"}
          alt={user.full_name || "User"}
          width={48}
          height={48}
          class="avatar-img"
        />
        {user.is_admin ? <span class="admin-dot">A</span> : null}
      </a>
      <a
        href={profileHref}
        class="auth-name hover:underline"
        aria-label="Open profile"
      >
        {user.full_name || user.email}
      </a>
      <button class="btn-auth" type="button" onClick={signOut}>
        {labels.signOut}
      </button>
    </div>
  );
}
