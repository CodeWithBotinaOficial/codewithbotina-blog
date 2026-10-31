import { useAuth } from "../../hooks/useAuth";
import { useBackendStatus } from "../../hooks/useBackendStatus";
import { useSession } from "../../hooks/useSession";

interface Props {
  labels: {
    signIn: string;
    signOut: string;
    loading: string;
    openProfile: string;
    userAlt: string;
    authUnavailable: string;
  };
  profileHref: string;
}

export default function HeaderAuthControls({ labels, profileHref }: Props) {
  const { user, loading } = useSession();
  const { signIn, signOut } = useAuth();
  const { isMaintenanceMode } = useBackendStatus();

  if (loading) {
    return <div class="auth-loading">{labels.loading}</div>;
  }

  if (!user) {
    return (
      <div class="auth-controls">
        <button
          type="button"
          onClick={signIn}
          disabled={isMaintenanceMode}
          class={isMaintenanceMode ? "btn-auth maintenance-disabled" : "btn-auth"}
          title={isMaintenanceMode ? labels.authUnavailable : undefined}
        >
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
        aria-label={labels.openProfile}
      >
        <img
          src={user.avatar_url || "/avatar-placeholder.png"}
          alt={user.full_name || labels.userAlt}
          width={48}
          height={48}
          class="avatar-img"
        />
        {user.is_admin ? <span class="admin-dot">A</span> : null}
      </a>
      <a
        href={profileHref}
        class="auth-name max-w-32 truncate hover:underline"
        aria-label={labels.openProfile}
      >
        {user.full_name || user.email}
      </a>
      <button
        type="button"
        onClick={signOut}
        disabled={isMaintenanceMode}
        class={isMaintenanceMode ? "btn-auth maintenance-disabled" : "btn-auth"}
        title={isMaintenanceMode ? labels.authUnavailable : undefined}
      >
        {labels.signOut}
      </button>
    </div>
  );
}
