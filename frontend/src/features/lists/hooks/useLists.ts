import { useState, useEffect, useCallback } from "react";
import type { CustomList } from "@/types";
import { 
   mergeLists, 
   deduplicateLists, 
   mapListCounts, 
   sortListsByDate,
   type RawSupabaseList 
} from "../logic/listOperations";
import {
   addCollaboratorsToList,
   addMovieToListRecord,
   createListRecord,
   fetchCollaborativeLists,
   fetchOwnedLists,
   listMovieExists,
   notifyListCollaborators,
   removeMovieFromListRecord,
   subscribeListsChanges,
   updateListRecord,
} from "../services/listsService";


export function useLists(userId?: string, currentUserId?: string) {
   const [lists, setLists] = useState<CustomList[]>([]);
   const [loading, setLoading] = useState(true);

   const fetchLists = useCallback(async () => {
      if (!userId) return;
      setLoading(true);
      try {
         const myLists = await fetchOwnedLists(userId, currentUserId);
         const sharedLists = await fetchCollaborativeLists(userId, currentUserId);

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
   }, [userId, currentUserId]);
   
   useEffect(() => {
      if (userId) {
         fetchLists();
      }
   }, [userId, fetchLists]);

   useEffect(() => {
      if (!userId) return;

      return subscribeListsChanges(userId, fetchLists);
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
         const newList = await createListRecord({
            ownerId: userId,
            name,
            description,
            type,
            has_rating,
            rating_type,
            manual_rating,
            auto_sync,
         });

         if (type !== "private" && collaboratorIds.length > 0) {
            await addCollaboratorsToList(newList.id, collaboratorIds);
            await notifyListCollaborators(userId, newList.id, type, collaboratorIds);
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
         const exists = await listMovieExists(listId, tmdbId);

         if (exists) {
            return { success: true, error: null };
         }

         await addMovieToListRecord(listId, tmdbId, userId);

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
         await updateListRecord(listId, { name, description, has_rating, rating_type, manual_rating, auto_sync });
         
         fetchLists(); 
         return { success: true, error: null };
      } catch (error) {
         console.error("Erro ao atualizar lista:", error);
         return { success: false, error: "Erro ao atualizar a lista." };
      }
   };

   const removeMovieFromList = async (listId: string, tmdbId: number) => {
      try {
         await removeMovieFromListRecord(listId, tmdbId);
         
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