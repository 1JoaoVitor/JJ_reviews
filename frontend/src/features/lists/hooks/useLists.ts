import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import type { CustomList } from "@/types";

export function useLists(userId?: string) {
   const [lists, setLists] = useState<CustomList[]>([]);
   const [loading, setLoading] = useState(true);

   const fetchLists = useCallback(async () => {
      if (!userId) return;
      setLoading(true);
      try {
         // Busca as listas que EU criei (Dono)
         const { data: myLists, error: err1 } = await supabase
            .from("lists")
            .select("*, list_movies(count)")
            .eq("owner_id", userId)
            .order("created_at", { ascending: false });

         if (err1) throw err1;

         // Busca as listas onde EU sou colaborador aceito
         const { data: collabData, error: err2 } = await supabase
            .from("list_collaborators")
            .select("list_id, lists(*, list_movies(count))")
            .eq("user_id", userId)
            .in("status", ["accepted", "pending"]);

         if (err2) throw err2;

         const sharedLists = collabData?.map(item => item.lists) || [];

         // Junta tudo, remove possíveis duplicatas e atualiza o estado
         const allLists = [...(myLists || []), ...sharedLists];
         
         // Remove duplicadas baseadas no ID (caso haja algum bug no banco)
         const uniqueLists = Array.from(new Map(allLists.map(item => [item.id, item])).values());

         // Ordena pelas mais recentes
         uniqueLists.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

         // Mapeia o count agregado para movie_count
         const listsWithCount = uniqueLists.map(list => ({
            ...list,
            movie_count: (list as Record<string, unknown>).list_movies
               ? ((list as Record<string, unknown>).list_movies as { count: number }[])[0]?.count ?? 0
               : 0,
         }));

         setLists(listsWithCount as CustomList[]);
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
         .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'custom_lists' },
            () => {
               fetchLists(); 
            }
         )
         // Ouve se o usuário foi removido de alguma lista (ex: recusou convite ou foi expulso)
         .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'list_members', filter: `user_id=eq.${userId}` },
            () => {
               fetchLists(); // Recarrega as listas do usuário
            }
         )
         .subscribe();

      // Limpeza do canal quando o componente for desmontado
      return () => {
         supabase.removeChannel(listsChannel);
      };
   }, [userId, fetchLists]);

   const createList = async (
      name: string, 
      description: string, 
      type: "private" | "partial_shared" | "full_shared" = "private",
      collaboratorIds: string[] = []
   ) => {
      if (!userId) return null;
      setLoading(true);

      try {
         const { data: newList, error } = await supabase
            .from("lists")
            .insert([{ owner_id: userId, name, description, type }])
            .select()
            .single();

         if (error) throw error;

         // Se for uma lista compartilhada e tiver convidados, adiciona eles
         if (type !== "private" && collaboratorIds.length > 0) {
            
            // Prepara os dados para a tabela list_collaborators
            const collaboratorsData = collaboratorIds.map(friendId => ({
               list_id: newList.id,
               user_id: friendId,
               role: 'member',
               status: 'pending' // Ficam pendentes até aceitarem no sininho
            }));

            const { error: collabError } = await supabase
               .from("list_collaborators")
               .insert(collaboratorsData);

            if (collabError) throw collabError;

            // Dispara a notificação para cada amigo convidado
            const notificationsData = collaboratorIds.map(friendId => ({
               user_id: friendId,
               sender_id: userId,
               type: 'list_invite',
               message: type === 'full_shared' 
                  ? 'convidou você para uma Lista Unificada!'
                  : 'convidou você para uma Lista Colaborativa!',
               reference_id: newList.id,
            }));

            await supabase.from("notifications").insert(notificationsData);
         }

         setLists((prev) => [newList as CustomList, ...prev]);
         return newList as CustomList;
      } catch (error) {
         console.error("Erro ao criar lista:", error);
         return null;
      } finally {
         setLoading(false);
      }
   };

   const addMovieToList = async (listId: string, tmdbId: number) => {
      if (!userId) return false;
      try {
         const { error } = await supabase
            .from("list_movies")
            .upsert(
               { list_id: listId, tmdb_id: tmdbId, added_by: userId },
               { onConflict: 'list_id, tmdb_id', ignoreDuplicates: true }
            );
            
         if (error) throw error;
         
         setLists(prev => prev.map(list => 
            list.id === listId ? { ...list, movie_count: (list.movie_count || 0) + 1 } : list
         ));

         return true;
      } catch (error) {
         console.error("Erro ao adicionar filme à lista:", error);
         return false;
      }
   };

   // Função para editar nome e descrição da lista
   const updateList = async (listId: string, name: string, description: string) => {
      try {
         const { error } = await supabase
            .from("lists")
            .update({ name, description })
            .eq("id", listId);

         if (error) throw error;
         
         toast.success("Lista atualizada com sucesso!");
         fetchLists(); 
         return true;
      } catch (error) {
         console.error("Erro ao atualizar lista:", error);
         toast.error("Erro ao atualizar a lista.");
         return false;
      }
   };

   // Função para remover um filme de uma lista
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

         toast.success("Filme removido da lista.");
         return true;
      } catch (error) {
         console.error("Erro ao remover filme da lista:", error);
         return false;
      }
   }

   return { lists, loading, fetchLists, createList, addMovieToList, updateList, removeMovieFromList};
}