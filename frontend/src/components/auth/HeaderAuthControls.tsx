import { useEffect } from "preact/hooks";
import { useAuth } from "../../hooks/useAuth";
import { useSession } from "../../hooks/useSession";
import { initAuthListener } from "../../lib/auth";
import { getApiUrl } from "../../lib/env";

interface Props {
  labels: {
    signIn: string;
    signOut: string;
    loading: string;
  };
}

export default function HeaderAuthControls({ labels }: Props) {
  initAuthListener();
  const { user, loading } = useSession();
  const { signIn, signOut } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;

    const apiUrl = getApiUrl();
    const next = window.location.origin + window.location.pathname;
    const redirect = `${apiUrl}/api/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`;
    window.location.replace(redirect);
  }, []);

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
