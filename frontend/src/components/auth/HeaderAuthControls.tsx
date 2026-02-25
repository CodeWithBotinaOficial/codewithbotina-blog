import SignInButton from "./SignInButton.astro";
import SignOutButton from "./SignOutButton.astro";
import UserAvatar from "./UserAvatar.astro";
import { useSession } from "../../hooks/useSession";

export default function HeaderAuthControls() {
  const { user, loading } = useSession();

  if (loading) {
    return <div class="auth-loading">Loading...</div>;
  }

  if (!user) {
    return (
      <div class="auth-controls">
        <SignInButton />
      </div>
    );
  }

  return (
    <div class="auth-controls">
      <UserAvatar
        avatarUrl={user.avatar_url}
        name={user.full_name || user.email}
        isAdmin={Boolean(user.is_admin)}
      />
      <span class="auth-name">{user.full_name || user.email}</span>
      <SignOutButton />
    </div>
  );
}
