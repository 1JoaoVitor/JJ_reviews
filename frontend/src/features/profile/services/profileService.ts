import { supabase } from "@/lib/supabase";

export interface UserProfileRecord {
   username: string;
   avatarUrl: string | null;
}

export async function fetchUserProfile(userId: string): Promise<UserProfileRecord> {
   const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url, username")
      .eq("id", userId)
      .single();

   if (error) throw error;

   return {
      username: data?.username || "",
      avatarUrl: data?.avatar_url || null,
   };
}

export async function updateUserProfileName(userId: string, username: string): Promise<void> {
   const { error } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", userId);

   if (error) throw error;
}

export async function uploadUserAvatar(userId: string, imageBlob: Blob): Promise<string> {
   const fileName = `${userId}-${Math.random()}.jpg`;

   const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, imageBlob, { upsert: true, contentType: "image/jpeg" });

   if (uploadError) throw uploadError;

   const {
      data: { publicUrl },
   } = supabase.storage.from("avatars").getPublicUrl(fileName);

   const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

   if (updateError) throw updateError;

   return publicUrl;
}
