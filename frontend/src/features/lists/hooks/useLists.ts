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
         // Busca as listas onde o usuário é o dono
         const { data, error } = await supabase
            .from("lists")
            .select("*")
            .eq("owner_id", userId)
            .order("created_at", { ascending: false });

         if (error) throw error;
         setLists(data || []);
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

   return { lists, loading, fetchLists, createList, addMovieToList};
}