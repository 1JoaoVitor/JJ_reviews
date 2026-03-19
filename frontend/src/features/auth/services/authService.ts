import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

interface ProfileRow {
   username: string | null;
   avatar_url: string | null;
}

export async function fetchProfileByUserId(userId: string): Promise<ProfileRow> {
   const { data, error } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .single();

   if (error) throw error;
   return data as ProfileRow;
}

export async function getCurrentSession(): Promise<Session | null> {
   const {
      data: { session },
   } = await supabase.auth.getSession();
   return session;
}

export function subscribeToAuthStateChanges(onSessionChange: (session: Session | null) => void): () => void {
   const {
      data: { subscription },
   } = supabase.auth.onAuthStateChange((_event, session) => {
      onSessionChange(session);
   });

   return () => subscription.unsubscribe();
}

export async function signOutCurrentUser(): Promise<void> {
   const { error } = await supabase.auth.signOut();
   if (error) throw error;
}

export async function isUsernameTaken(username: string): Promise<boolean> {
   const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .ilike("username", username)
      .maybeSingle();

   if (error) throw error;
   return !!data;
}

export async function signUpWithUsername(email: string, password: string, username: string): Promise<void> {
   const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
   });

   if (error) throw error;
}

export async function getEmailByUsername(username: string): Promise<string | null> {
   const { data, error } = await supabase.rpc("get_email_by_username", {
      p_username: username.toLowerCase(),
   });

   if (error) throw error;
   return data || null;
}

export async function signInWithEmailPassword(email: string, password: string): Promise<void> {
   const { error } = await supabase.auth.signInWithPassword({ email, password });
   if (error) throw error;
}

export async function sendResetPasswordLink(email: string, redirectTo: string): Promise<void> {
   const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
   if (error) throw error;
}

export async function updateCurrentUserPassword(newPassword: string): Promise<void> {
   const { error } = await supabase.auth.updateUser({ password: newPassword });
   if (error) throw error;
}
