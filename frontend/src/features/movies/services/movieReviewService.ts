import { supabase } from "@/lib/supabase";

export async function deleteReviewById(reviewId: string): Promise<void> {
   const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
   if (error) throw error;
}

export async function removeMovieFromPrivateLists(tmdbId: number, privateListIds: string[]): Promise<void> {
   if (privateListIds.length === 0) return;

   const { error } = await supabase
      .from("list_movies")
      .delete()
      .eq("tmdb_id", tmdbId)
      .in("list_id", privateListIds);

   if (error) throw error;
}
