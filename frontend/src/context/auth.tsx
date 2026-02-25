import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { AuthUser } from "../hooks/useSession";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
}

const defaultValue: AuthContextValue = {
  user: null,
  loading: true,
};

export const AuthContext = createContext<AuthContextValue>(defaultValue);

export function useAuthContext() {
  return useContext(AuthContext);
}
