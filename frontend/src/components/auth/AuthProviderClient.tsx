import type { ComponentChildren } from "preact";
import { AuthContext } from "../../context/auth";
import { useSession } from "../../hooks/useSession";

interface Props {
  children: ComponentChildren;
}

export default function AuthProviderClient({ children }: Props) {
  const { user, loading } = useSession();

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
