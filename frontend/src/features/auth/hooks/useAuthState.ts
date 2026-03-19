import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { toAuthProfile } from "../logic/profileSync";

/**
 * Shell de autenticação: integra Supabase e mantém estado global de sessão/perfil.
 */
export function useAuthState() {
   const [session, setSession] = useState<Session | null>(null);
   const [username, setUsername] = useState("");
   const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
   const [loading, setLoading] = useState(true);

   const fetchProfile = useCallback(async (userId: string) => {
      try {
         const { data, error } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", userId)
            .single();
         if (error) throw error;

         const profile = toAuthProfile(data);
         setUsername(profile.username);
         setAvatarUrl(profile.avatarUrl);
      } catch (err) {
         console.error("Erro ao buscar perfil:", err);
      }
   }, []);

   useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
         setSession(session);
         if (session) fetchProfile(session.user.id);
         setLoading(false);
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

   const logout = useCallback(async () => {
      await supabase.auth.signOut();
      window.location.href = "/";
   }, []);

   const updateUsername = useCallback((newUsername: string) => {
      setUsername(newUsername);
   }, []);

   return { session, username, avatarUrl, logout, updateUsername, fetchProfile, loading };
}
