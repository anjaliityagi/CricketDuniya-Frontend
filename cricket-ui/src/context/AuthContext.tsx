import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getStoredAuth,
  logout as logoutRequest,
  type AuthUser,
} from "@/services/auth";

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setSession: (session: { token: string | null; user: AuthUser | null }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState(() => getStoredAuth());

  function setSession(session: { token: string | null; user: AuthUser | null }) {
    setAuth(session);
  }

  function logout() {
    logoutRequest();
    setAuth({ token: null, user: null });
  }

  const value = useMemo(
    () => ({
      token: auth.token,
      user: auth.user,
      isAuthenticated: Boolean(auth.token),
      setSession,
      logout,
    }),
    [auth.token, auth.user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
