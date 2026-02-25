import { useSession } from "../../hooks/useSession";

export default function UserProfileClient() {
  const { user, loading } = useSession();

  if (loading) {
    return <p>Loading profile...</p>;
  }

  if (!user) {
    return <p class="text-muted">You are not signed in.</p>;
  }

  return (
    <div class="profile-card">
      <img
        class="avatar"
        src={user.avatar_url || "/avatar-placeholder.png"}
        alt={user.full_name || "User avatar"}
        width={56}
        height={56}
      />
      <div>
        <p class="name">{user.full_name || user.email}</p>
        <p class="email">{user.email}</p>
        {user.is_admin ? <span class="badge">Admin</span> : null}
      </div>
    </div>
  );
}
