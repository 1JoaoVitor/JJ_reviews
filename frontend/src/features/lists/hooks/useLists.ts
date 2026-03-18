import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { CustomList } from "@/types";
import { 
   mergeLists, 
   deduplicateLists, 
   mapListCounts, 
   sortListsByDate,
   type RawSupabaseList 
} from "../logic/listOperations";


export function useLists(userId?: string) {
   const [lists, setLists] = useState<CustomList[]>([]);
   const [loading, setLoading] = useState(true);

   const fetchLists = useCallback(async () => {
      if (!userId) return;
      setLoading(true);
      try {
         const { data: myLists, error: err1 } = await supabase
            .from("lists")
            .select("*, list_movies(count)")
            .eq("owner_id", userId);

         if (err1) throw err1;

         const { data: collabData, error: err2 } = await supabase
            .from("list_collaborators")
            .select("list_id, lists(*, list_movies(count))")
            .eq("user_id", userId)
            .in("status", ["accepted", "pending"]);

         if (err2) throw err2;

         const sharedLists = collabData?.flatMap(item => item.lists) || [];

         const merged = mergeLists(myLists as unknown as RawSupabaseList[], sharedLists as unknown as RawSupabaseList[]);
         const unique = deduplicateLists(merged);
         const withCounts = mapListCounts(unique);
         const finalSortedLists = sortListsByDate(withCounts);

         setLists(finalSortedLists);
         
      } catch (error) {
         console.error("Erro ao buscar listas:", error);
      } finally {
         setLoading(false);
      }
   }, [userId]);
   
   useEffect(() => {
      if (userId) {
         fetchLists();
      }
   }, [userId, fetchLists]);

   useEffect(() => {
      if (!userId) return;

      const listsChannel = supabase
         .channel('custom-all-lists-changes')
         .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'lists' }, () => { fetchLists(); })
         .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'list_collaborators' , filter: `user_id=eq.${userId}` }, () => { fetchLists(); })
         .subscribe();

      return () => {
         supabase.removeChannel(listsChannel);
      };
   }, [userId, fetchLists]);

   const createList = async (
      name: string, 
      description: string, 
      type: "private" | "partial_shared" | "full_shared" = "private",
      collaboratorIds: string[] = [],
      has_rating: boolean = false, 
      rating_type: "manual" | "average" | null = null,
      manual_rating: number | null = null,
      auto_sync: boolean = false,
   ) => {
      if (!userId) return { success: false, data: null, error: "Usuário não autenticado." };
      setLoading(true);

      try {
         const { data: newList, error } = await supabase
            .from("lists")
            .insert([{ owner_id: userId, name, description, type, has_rating, rating_type, manual_rating, auto_sync }])
            .select()
            .single();

         if (error) throw error;

         if (type !== "private" && collaboratorIds.length > 0) {
            const collaboratorsData = collaboratorIds.map(friendId => ({
               list_id: newList.id, user_id: friendId, role: 'member', status: 'pending'
            }));

            const { error: collabError } = await supabase.from("list_collaborators").insert(collaboratorsData);
            if (collabError) throw collabError;

            const notificationsData = collaboratorIds.map(friendId => ({
               user_id: friendId, sender_id: userId, type: 'list_invite',
               message: type === 'full_shared' ? 'convidou você para uma Lista Unificada!' : 'convidou você para uma Lista Colaborativa!',
               reference_id: newList.id,
            }));

            await supabase.from("notifications").insert(notificationsData);
         }

         setLists((prev) => [newList as CustomList, ...prev]);
         return { success: true, data: newList as CustomList, error: null };
      } catch (error) {
         console.error("Erro ao criar lista:", error);
         return { success: false, data: null, error: "Erro ao criar a lista." };
      } finally {
         setLoading(false);
      }
   };

   const addMovieToList = async (listId: string, tmdbId: number) => {
      if (!userId) return { success: false, error: "Usuário não autenticado." };
      try {
         const { data: existingMovie, error: fetchError } = await supabase
            .from("list_movies")
            .select("tmdb_id")
            .match({ list_id: listId, tmdb_id: tmdbId })
            .maybeSingle(); 

         if (fetchError) throw fetchError;

         if (existingMovie) {
            return { success: true, error: null };
         }

         const { error: insertError } = await supabase
            .from("list_movies")
            .insert([{ list_id: listId, tmdb_id: tmdbId, added_by: userId }]);
            
         if (insertError) throw insertError;

         setLists(prev => prev.map(list => 
            list.id === listId ? { ...list, movie_count: (list.movie_count || 0) + 1 } : list
         ));

         return { success: true, error: null };
      } catch (error) {
         console.error("Erro ao adicionar filme à lista:", error);
         return { success: false, error: "Erro ao adicionar filme à lista." };
      }
   };

   const updateList = async (
      listId: string, 
      name: string, 
      description: string,
      has_rating: boolean,
      rating_type: "manual" | "average" | null,
      manual_rating: number | null,
      auto_sync: boolean,
   ) => {
      try {
         const { error } = await supabase
            .from("lists")
            .update({ name, description, has_rating, rating_type, manual_rating, auto_sync })
            .eq("id", listId);

         if (error) throw error;
         
         fetchLists(); 
         return { success: true, error: null };
      } catch (error) {
         console.error("Erro ao atualizar lista:", error);
         return { success: false, error: "Erro ao atualizar a lista." };
      }
   };

   const removeMovieFromList = async (listId: string, tmdbId: number) => {
      try {
         const { error } = await supabase
            .from("list_movies")
            .delete()
            .match({ list_id: listId, tmdb_id: tmdbId });

         if (error) throw error;
         
         setLists(prev => prev.map(list => 
            list.id === listId ? { ...list, movie_count: Math.max(0, (list.movie_count || 0) - 1) } : list
         ));

         return { success: true, error: null };
      } catch (error) {
         console.error("Erro ao remover filme da lista:", error);
         return { success: false, error: "Erro ao remover filme da lista." };
      }
   }

   return { lists, loading, fetchLists, createList, addMovieToList, updateList, removeMovieFromList};
}