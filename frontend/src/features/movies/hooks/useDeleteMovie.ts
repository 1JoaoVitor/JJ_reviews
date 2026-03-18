import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
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
        // Deleta a review do filme
         const { error } = await supabase
            .from("reviews")
            .delete()
            .eq("id", movie.id);
            
         if (error) throw error;

         // Identifica quais são as suas listas particulares
         const privateListIds = lists
            .filter(l => l.type === "private" || !l.type)
            .map(l => l.id);

         // Se tiver listas particulares, varre e apaga o filme delas também
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
         
         toast.success("Filme removido do perfil e das listas particulares!");
      } catch (error) {
         toast.error("Erro ao excluir!");
         console.error(error);
      }
   };

   return { handleDeleteMovie };
}