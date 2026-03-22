import { supabase } from "@/lib/supabase";
import { notifyFriendsDiaryActivity } from "@/features/diary/services/diaryService";

interface ExistingProfileReview {
   id: string;
   status?: "watched" | "watchlist" | string;
}

interface PersonalReviewPayload {
   rating: number | null;
   review: string | null;
   recommended: string | null;
   runtime: number;
   location: string | null;
   status: "watched" | "watchlist";
   attachment_url: string | null;
   watched_date?: string;
}

interface FullSharedListReviewPayload {
   rating: number;
   review: string;
   recommended: string;
}

interface PartialSharedListReviewPayload {
   rating: number;
   review: string;
   recommended: string;
   location: string;
   runtime: number;
}

interface SyncListReviewPayload {
   listId: string;
   tmdbId: number;
   rating: number;
   review: string;
   recommended: string;
   status: "watched" | "watchlist";
   addedBy: string;
   location: string;
   runtime: number;
}

export async function getAuthenticatedUser() {
   const {
      data: { user },
      error,
   } = await supabase.auth.getUser();

   if (error || !user) return null;
   return user;
}

export async function hasUserReview(userId: string, tmdbId: number): Promise<boolean> {
   const { data, error } = await supabase
      .from("reviews")
      .select("id")
      .eq("user_id", userId)
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

   if (error) throw error;
   return !!data;
}

export async function getExistingProfileReview(
   userId: string,
   tmdbId: number
): Promise<ExistingProfileReview | null> {
   const { data, error } = await supabase
      .from("reviews")
      .select("id, status")
      .eq("user_id", userId)
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

   if (error) throw error;
   return (data as ExistingProfileReview | null) || null;
}

export async function uploadReviewAttachment(userId: string, attachmentFile: File): Promise<string> {
   const fileExt = attachmentFile.name.split(".").pop();
   const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

   const { error: uploadError } = await supabase.storage
      .from("review_attachments")
      .upload(fileName, attachmentFile);

   if (uploadError) throw uploadError;

   const {
      data: { publicUrl },
   } = supabase.storage.from("review_attachments").getPublicUrl(fileName);

   return publicUrl;
}

export async function upsertPersonalReview(
   userId: string,
   tmdbId: number,
   payload: PersonalReviewPayload
): Promise<void> {
   const { data: existingPersonalReview, error: existingError } = await supabase
      .from("reviews")
      .select("id")
      .eq("user_id", userId)
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

   if (existingError) throw existingError;

   const reviewPayload = {
      tmdb_id: tmdbId,
      user_id: userId,
      ...payload,
   };

   const watchedDate = payload.watched_date;
   delete (reviewPayload as { watched_date?: string }).watched_date;

   if (existingPersonalReview) {
      const { error } = await supabase.from("reviews").update(reviewPayload).eq("id", existingPersonalReview.id);
      if (error) throw error;
      if (payload.status === "watched") {
         await saveDiaryEntry(userId, tmdbId, watchedDate);
      }
      return;
   }

   const { error } = await supabase.from("reviews").insert([reviewPayload]);
   if (error) throw error;

   if (payload.status === "watched") {
      await saveDiaryEntry(userId, tmdbId, watchedDate);
   }
}

async function saveDiaryEntry(userId: string, tmdbId: number, watchedDate?: string): Promise<void> {
   const normalizedDate = watchedDate || new Date().toISOString().slice(0, 10);

   const { error } = await supabase.from("diary_entries").upsert(
      {
         user_id: userId,
         tmdb_id: tmdbId,
         watched_date: normalizedDate,
      },
      {
         onConflict: "user_id,tmdb_id,watched_date",
         ignoreDuplicates: true,
      }
   );

   if (error) {
      throw error;
   }

   try {
      await notifyFriendsDiaryActivity(userId, normalizedDate);
   } catch (notifyError) {
      console.error("Falha ao notificar amigos sobre watch no diary:", notifyError);
   }
}

export async function upsertFullSharedListReview(
   listId: string,
   tmdbId: number,
   payload: FullSharedListReviewPayload
): Promise<void> {
   const { data: existingGroupReview, error: existingError } = await supabase
      .from("list_reviews")
      .select("id")
      .eq("list_id", listId)
      .eq("tmdb_id", tmdbId)
      .is("user_id", null)
      .maybeSingle();

   if (existingError) throw existingError;

   if (existingGroupReview) {
      const { error } = await supabase.from("list_reviews").update(payload).eq("id", existingGroupReview.id);
      if (error) throw error;
      return;
   }

   const { error } = await supabase.from("list_reviews").insert({
      list_id: listId,
      tmdb_id: tmdbId,
      user_id: null,
      ...payload,
   });

   if (error) throw error;
}

export async function upsertPartialSharedListReview(
   listId: string,
   tmdbId: number,
   userId: string,
   payload: PartialSharedListReviewPayload
): Promise<void> {
   const { data: existingUserReview, error: existingError } = await supabase
      .from("list_reviews")
      .select("id")
      .eq("list_id", listId)
      .eq("tmdb_id", tmdbId)
      .eq("user_id", userId)
      .maybeSingle();

   if (existingError) throw existingError;

   if (existingUserReview) {
      const { error } = await supabase.from("list_reviews").update(payload).eq("id", existingUserReview.id);
      if (error) throw error;
      return;
   }

   const { error } = await supabase.from("list_reviews").insert({
      list_id: listId,
      tmdb_id: tmdbId,
      user_id: userId,
      ...payload,
   });

   if (error) throw error;
}

export async function syncReviewToListMembers(payload: SyncListReviewPayload): Promise<void> {
   const { error } = await supabase.rpc("sync_review_to_list_members", {
      p_list_id: payload.listId,
      p_tmdb_id: payload.tmdbId,
      p_rating: payload.rating,
      p_review: payload.review,
      p_recommended: payload.recommended,
      p_status: payload.status,
      p_added_by: payload.addedBy,
      p_location: payload.location,
      p_runtime: payload.runtime,
   });

   if (error) throw error;
}
