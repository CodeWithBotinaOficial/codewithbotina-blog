import { useSession } from "../../hooks/useSession";
import { getLanguageFromPath, t } from "../../lib/i18n";

export default function UserProfileClient() {
  const { user, loading } = useSession();
  const language = typeof window === "undefined"
    ? "en"
    : getLanguageFromPath(window.location.pathname);

  if (loading) {
    return <p>{t(language, "profile.loading")}</p>;
  }

  if (!user) {
    return <p class="text-muted">{t(language, "profile.notSignedIn")}</p>;
  }

  return (
    <div class="profile-card">
      <img
        class="avatar"
        src={user.avatar_url || "/avatar-placeholder.png"}
        alt={user.full_name || t(language, "profile.avatarAlt")}
        width={56}
        height={56}
      />
      <div>
        <p class="name">{user.full_name || user.email}</p>
        <p class="email">{user.email}</p>
        {user.is_admin
          ? <span class="badge">{t(language, "profile.adminBadge")}</span>
          : null}
      </div>
    </div>
  );
}
