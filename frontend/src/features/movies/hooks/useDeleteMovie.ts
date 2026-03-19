import type { MovieData, CustomList } from "@/types";
import { deleteReviewById, removeMovieFromPrivateLists } from "../services/movieReviewService";

interface UseDeleteMovieProps {
   lists: CustomList[];
   fetchMovies: () => void;
   fetchLists: () => void;
   closeModal: () => void;
}

export function useDeleteMovie({ lists, fetchMovies, fetchLists, closeModal }: UseDeleteMovieProps) {
   
   const handleDeleteMovie = async (movie: MovieData) => {
      try {
         await deleteReviewById(movie.id);

         const privateListIds = lists
            .filter(l => l.type === "private" || !l.type)
            .map(l => l.id);

         if (privateListIds.length > 0 && movie.tmdb_id) {
            try {
               await removeMovieFromPrivateLists(movie.tmdb_id, privateListIds);
            } catch (listError) {
               console.error("Erro ao limpar das listas particulares:", listError);
            }
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