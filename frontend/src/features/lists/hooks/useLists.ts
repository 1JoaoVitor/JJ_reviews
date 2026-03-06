import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import type { CustomList } from "@/types";

export function useLists(userId?: string) {
   const [lists, setLists] = useState<CustomList[]>([]);
   const [loading, setLoading] = useState(true);

   const fetchLists = useCallback(async () => {
      if (!userId) {
         setLists([]);
         setLoading(false);
         return;
      }

      setLoading(true);
      try {
         // Busca as listas com contagem de filmes
         const { data, error } = await supabase
            .from("lists")
            .select("*, list_movies(count)")
            .eq("owner_id", userId)
            .order("created_at", { ascending: false });

         if (error) throw error;
         const listsWithCount = (data || []).map((list: CustomList & { list_movies?: { count: number }[] }) => ({
            ...list,
            movie_count: list.list_movies?.[0]?.count ?? 0,
            list_movies: undefined,
         }));
         setLists(listsWithCount);
      } catch (error) {
         console.error("Erro ao buscar listas:", error);
         toast.error("Não foi possível carregar suas listas.");
      } finally {
         setLoading(false);
      }
   }, [userId]);

   useEffect(() => {
      fetchLists();
   }, [fetchLists]);

   const createList = async (name: string, description: string) => {
      if (!userId) return null;
      
      try {
         const { data, error } = await supabase
            .from("lists")
            .insert([{ name, description, owner_id: userId }])
            .select()
            .single();

         if (error) throw error;
         
         toast.success("Lista criada com sucesso!");
         fetchLists(); // Recarrega as listas
         return data;
      } catch (error) {
         console.error("Erro ao criar lista:", error);
         toast.error("Erro ao criar a lista.");
         return null;
      }
   };

   const addMovieToList = async (listId: string, tmdbId: number) => {
      if (!userId) return false;
      try {
         const { error } = await supabase
            .from("list_movies")
            .insert({ list_id: listId, tmdb_id: tmdbId, added_by: userId });
            
         if (error) {
            // Se o erro for de duplicação (filme já está na lista), ignoramos
            if (error.code === '23505') return true; 
            throw error;
         }
         return true;
      } catch (error) {
         console.error("Erro ao adicionar filme à lista:", error);
         toast.error("Erro ao guardar filme na lista customizada.");
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
         toast.success("Filme removido da lista.");
         return true;
      } catch (error) {
         console.error("Erro ao remover filme da lista:", error);
         toast.error("Erro ao remover o filme.");
         return false;
      }
   };

   return { lists, loading, fetchLists, createList, addMovieToList, updateList, removeMovieFromList};
}