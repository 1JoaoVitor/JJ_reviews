import { supabase } from "@/lib/supabase";
import type { CustomList } from "@/types";
import type { RawSupabaseList } from "../logic/listOperations";

export async function fetchOwnedLists(userId: string): Promise<RawSupabaseList[]> {
   const { data, error } = await supabase
      .from("lists")
      .select("*, list_movies(count)")
      .eq("owner_id", userId);

   if (error) throw error;
   return (data || []) as RawSupabaseList[];
}

export async function fetchCollaborativeLists(userId: string): Promise<RawSupabaseList[]> {
   const { data, error } = await supabase
      .from("list_collaborators")
      .select("list_id, lists(*, list_movies(count))")
      .eq("user_id", userId)
      .in("status", ["accepted", "pending"]);

   if (error) throw error;

   const collabData = data || [];
   return collabData.flatMap((item: { lists?: RawSupabaseList | RawSupabaseList[] | null }) => {
      if (!item.lists) return [];
      return Array.isArray(item.lists) ? item.lists : [item.lists];
   });
}

export function subscribeListsChanges(userId: string, onChange: () => void): () => void {
   const listsChannel = supabase
      .channel("custom-all-lists-changes")
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "lists" }, onChange)
      .on(
         "postgres_changes",
         { event: "DELETE", schema: "public", table: "list_collaborators", filter: `user_id=eq.${userId}` },
         onChange
      )
      .subscribe();

   return () => {
      supabase.removeChannel(listsChannel);
   };
}

interface CreateListInput {
   ownerId: string;
   name: string;
   description: string;
   type: "private" | "partial_shared" | "full_shared";
   has_rating: boolean;
   rating_type: "manual" | "average" | null;
   manual_rating: number | null;
   auto_sync: boolean;
}

export async function createListRecord(input: CreateListInput): Promise<CustomList> {
   const { data, error } = await supabase
      .from("lists")
      .insert([
         {
            owner_id: input.ownerId,
            name: input.name,
            description: input.description,
            type: input.type,
            has_rating: input.has_rating,
            rating_type: input.rating_type,
            manual_rating: input.manual_rating,
            auto_sync: input.auto_sync,
         },
      ])
      .select()
      .single();

   if (error) throw error;
   return data as CustomList;
}

export async function addCollaboratorsToList(
   listId: string,
   collaboratorIds: string[]
): Promise<void> {
   if (collaboratorIds.length === 0) return;

   const collaboratorsData = collaboratorIds.map((friendId) => ({
      list_id: listId,
      user_id: friendId,
      role: "member",
      status: "pending",
   }));

   const { error } = await supabase.from("list_collaborators").insert(collaboratorsData);
   if (error) throw error;
}

export async function notifyListCollaborators(
   ownerId: string,
   listId: string,
   listType: "private" | "partial_shared" | "full_shared",
   collaboratorIds: string[]
): Promise<void> {
   if (collaboratorIds.length === 0 || listType === "private") return;

   const notificationsData = collaboratorIds.map((friendId) => ({
      user_id: friendId,
      sender_id: ownerId,
      type: "list_invite",
      message:
         listType === "full_shared"
            ? "convidou você para uma Lista Unificada!"
            : "convidou você para uma Lista Colaborativa!",
      reference_id: listId,
   }));

   await supabase.from("notifications").insert(notificationsData);
}

export async function listMovieExists(listId: string, tmdbId: number): Promise<boolean> {
   const { data, error } = await supabase
      .from("list_movies")
      .select("tmdb_id")
      .match({ list_id: listId, tmdb_id: tmdbId })
      .maybeSingle();

   if (error) throw error;
   return !!data;
}

export async function addMovieToListRecord(listId: string, tmdbId: number, addedBy: string): Promise<void> {
   const { error } = await supabase
      .from("list_movies")
      .insert([{ list_id: listId, tmdb_id: tmdbId, added_by: addedBy }]);

   if (error) throw error;
}

export async function updateListRecord(
   listId: string,
   payload: {
      name: string;
      description: string;
      has_rating: boolean;
      rating_type: "manual" | "average" | null;
      manual_rating: number | null;
      auto_sync: boolean;
   }
): Promise<void> {
   const { error } = await supabase.from("lists").update(payload).eq("id", listId);
   if (error) throw error;
}

export async function removeMovieFromListRecord(listId: string, tmdbId: number): Promise<void> {
   const { error } = await supabase.from("list_movies").delete().match({ list_id: listId, tmdb_id: tmdbId });
   if (error) throw error;
}

export interface ListOwnerProfile {
   username: string;
   avatar_url: string;
}

export interface SharedListReviewRow {
   tmdb_id: number;
   user_id: string | null;
   rating: number | null;
   review: string | null;
   recommended: string | null;
   user: { id: string; username: string; avatar_url: string } | { id: string; username: string; avatar_url: string }[] | null;
}

export interface ListCollaboratorRow {
   user_id: string;
   status: string;
   user: { id: string; username: string; avatar_url: string } | { id: string; username: string; avatar_url: string }[] | null;
}

export async function fetchListMovieIds(listId: string): Promise<number[]> {
   const { data, error } = await supabase.from("list_movies").select("tmdb_id").eq("list_id", listId);
   if (error) throw error;

   return (data || []).map((item: { tmdb_id: number }) => item.tmdb_id);
}

export async function fetchPrivateListReviews(ownerId: string, tmdbIds: number[]) {
   if (tmdbIds.length === 0) return [];

   const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("user_id", ownerId)
      .in("tmdb_id", tmdbIds);

   if (error) throw error;
   return data || [];
}

export async function fetchSharedListReviews(listId: string, tmdbIds: number[]): Promise<SharedListReviewRow[]> {
   if (tmdbIds.length === 0) return [];

   const { data, error } = await supabase
      .from("list_reviews")
      .select("*, user:profiles(id, username, avatar_url)")
      .eq("list_id", listId)
      .in("tmdb_id", tmdbIds);

   if (error) throw error;
   return (data || []) as SharedListReviewRow[];
}

export async function fetchListOwnerProfile(ownerId: string): Promise<ListOwnerProfile | null> {
   const { data, error } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", ownerId)
      .single();

   if (error) throw error;
   return (data as ListOwnerProfile | null) || null;
}

export async function fetchListCollaborators(listId: string): Promise<ListCollaboratorRow[]> {
   const { data, error } = await supabase
      .from("list_collaborators")
      .select(
         `
               user_id,
               status,
               user:profiles(id, username, avatar_url)
            `
      )
      .eq("list_id", listId);

   if (error) throw error;
   return (data || []) as ListCollaboratorRow[];
}

export function subscribeListDetailsChanges(
   listId: string,
   currentUserId: string | undefined,
   onListMoviesChange: () => void
): () => void {
   const channel = supabase
      .channel(`list_updates_${listId}`)
      .on(
         "postgres_changes",
         { event: "*", schema: "public", table: "list_movies", filter: `list_id=eq.${listId}` },
         onListMoviesChange
      )
      .on(
         "postgres_changes",
         { event: "*", schema: "public", table: "list_reviews", filter: `list_id=eq.${listId}` },
         onListMoviesChange
      );

   if (currentUserId) {
      channel.on(
         "postgres_changes",
         { event: "*", schema: "public", table: "reviews", filter: `user_id=eq.${currentUserId}` },
         onListMoviesChange
      );
   }

   channel.subscribe();

   return () => {
      supabase.removeChannel(channel);
   };
}

export async function acceptListInvite(listId: string, userId: string): Promise<void> {
   const { error } = await supabase
      .from("list_collaborators")
      .update({ status: "accepted" })
      .eq("list_id", listId)
      .eq("user_id", userId);

   if (error) throw error;
}

export async function rejectListInvite(listId: string, userId: string): Promise<void> {
   const { error } = await supabase
      .from("list_collaborators")
      .delete()
      .eq("list_id", listId)
      .eq("user_id", userId);

   if (error) throw error;
}

export async function deleteListRecord(listId: string): Promise<void> {
   const { error } = await supabase.from("lists").delete().eq("id", listId);
   if (error) throw error;
}

export async function deleteUserListReviews(listId: string, userId: string): Promise<void> {
   const { error } = await supabase
      .from("list_reviews")
      .delete()
      .eq("list_id", listId)
      .eq("user_id", userId);

   if (error) throw error;
}

export async function removeUserFromListCollaborators(listId: string, userId: string): Promise<void> {
   const { error } = await supabase
      .from("list_collaborators")
      .delete()
      .eq("list_id", listId)
      .eq("user_id", userId);

   if (error) throw error;
}
