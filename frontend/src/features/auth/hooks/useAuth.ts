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
   const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

   const fetchProfile = useCallback(async (userId: string) => {
      try {
         const { data, error } = await supabase
            .from("profiles")
            .select('username, avatar_url')
            .eq("id", userId)
            .single();
         if (error) throw error;
         if (data) {
            setUsername(data.username || "");
            setAvatarUrl(data.avatar_url);
         }
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
            setAvatarUrl(null);
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

   return { session, username, avatarUrl, logout, updateUsername, fetchProfile };
}
