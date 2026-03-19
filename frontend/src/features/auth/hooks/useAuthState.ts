import { useEffect, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { toAuthProfile } from "../logic/profileSync";
import {
   fetchProfileByUserId,
   getCurrentSession,
   signOutCurrentUser,
   subscribeToAuthStateChanges,
} from "../services/authService";

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
         const data = await fetchProfileByUserId(userId);

         const profile = toAuthProfile(data);
         setUsername(profile.username);
         setAvatarUrl(profile.avatarUrl);
      } catch (err) {
         console.error("Erro ao buscar perfil:", err);
      }
   }, []);

   useEffect(() => {
      getCurrentSession().then((session) => {
         setSession(session);
         if (session) fetchProfile(session.user.id);
         setLoading(false);
      });

      const unsubscribe = subscribeToAuthStateChanges((session) => {
         setSession(session);
         if (session) {
            fetchProfile(session.user.id);
         } else {
            setUsername("");
            setAvatarUrl(null);
         }
      });

      return unsubscribe;
   }, [fetchProfile]);

   const logout = useCallback(async () => {
      await signOutCurrentUser();
      window.location.href = "/";
   }, []);

   const updateUsername = useCallback((newUsername: string) => {
      setUsername(newUsername);
   }, []);

   return { session, username, avatarUrl, logout, updateUsername, fetchProfile, loading };
}
