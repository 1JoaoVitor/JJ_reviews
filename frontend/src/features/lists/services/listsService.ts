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
