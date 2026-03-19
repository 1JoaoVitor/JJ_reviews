import { createContext, useContext, createElement, type ReactNode } from "react";
import { useAuthState } from "./useAuthState";

type AuthContextValue = ReturnType<typeof useAuthState>;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
   const auth = useAuthState();
   return createElement(AuthContext.Provider, { value: auth }, children);
}

export function useAuth(): AuthContextValue {
   const context = useContext(AuthContext);
   if (!context) {
      throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
   }
   return context;
}
