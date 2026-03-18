import { supabase } from "@/lib/supabase";
import type { MovieData, CustomList } from "@/types";

interface UseDeleteMovieProps {
   lists: CustomList[];
   fetchMovies: () => void;
   fetchLists: () => void;
   closeModal: () => void;
}

export function useDeleteMovie({ lists, fetchMovies, fetchLists, closeModal }: UseDeleteMovieProps) {
   
   const handleDeleteMovie = async (movie: MovieData) => {
      try {
         const { error } = await supabase.from("reviews").delete().eq("id", movie.id);
         if (error) throw error;

         const privateListIds = lists
            .filter(l => l.type === "private" || !l.type)
            .map(l => l.id);

         if (privateListIds.length > 0 && movie.tmdb_id) {
            const { error: listError } = await supabase
               .from("list_movies")
               .delete()
               .eq("tmdb_id", movie.tmdb_id)
               .in("list_id", privateListIds);
            
            if (listError) console.error("Erro ao limpar das listas particulares:", listError);
         }

         closeModal();
         fetchMovies(); 
         fetchLists(); 
         return { success: true, error: null };
      } catch (error) {
         console.error(error);
         return { success: false, error: "Erro ao excluir filme do banco de dados." };
      }
   };

   return { handleDeleteMovie };
}