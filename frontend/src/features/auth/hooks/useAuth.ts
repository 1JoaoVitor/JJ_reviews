import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

/**
 * Hook que gerencia toda a lógica de autenticação (sessão, perfil, login/logout).
 * Centraliza o que antes estava espalhado no App.tsx.
 */
export function useAuth() {
   const [session, setSession] = useState<Session | null>(null);
   const [username, setUsername] = useState("");

   const fetchProfile = useCallback(async (userId: string) => {
      try {
         const { data, error } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", userId)
            .single();
         if (error) throw error;
         if (data) setUsername(data.username || "");
      } catch (err) {
         console.error("Erro ao buscar perfil:", err);
      }
   }, []);

   useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
         setSession(session);
         if (session) fetchProfile(session.user.id);
      });

      const {
         data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
         setSession(session);
         if (session) {
            fetchProfile(session.user.id);
         } else {
            setUsername("");
         }
      });

      return () => subscription.unsubscribe();
   }, [fetchProfile]);

   const logout = useCallback(() => {
      supabase.auth.signOut();
   }, []);

   const updateUsername = useCallback((newUsername: string) => {
      setUsername(newUsername);
   }, []);

   return { session, username, logout, updateUsername };
}
