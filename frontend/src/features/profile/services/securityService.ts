import { supabase } from "@/lib/supabase";

export async function verifyCurrentPassword(email: string, currentPassword: string): Promise<void> {
   const { error } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
   });

   if (error) {
      throw new Error("A senha atual está incorreta.");
   }
}

export async function updateCurrentUserPassword(newPassword: string): Promise<void> {
   const { error } = await supabase.auth.updateUser({ password: newPassword });
   if (error) throw error;
}

export async function deleteCurrentUserAccount(): Promise<void> {
   const { error } = await supabase.rpc("delete_user");
   if (error) throw error;
}
