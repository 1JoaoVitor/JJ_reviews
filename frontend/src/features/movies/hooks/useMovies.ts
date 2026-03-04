import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { enrichMovieWithTmdb } from "@/features/movies/services/tmdbService";
import type { MovieData } from "@/types";

/**
 * Hook que gerencia o carregamento dos filmes do Supabase
 * e o enriquecimento com dados do TMDB.
 */
export function useMovies(sessionExists: boolean) {
   const [movies, setMovies] = useState<MovieData[]>([]);
   const [loading, setLoading] = useState(true);

   const fetchMovies = useCallback(async () => {
      setLoading(true);
      try {
         const { data: supabaseData, error } = await supabase
            .from("reviews")
            .select("*")
            .order("created_at", { ascending: false });

         if (error) throw error;
         if (!supabaseData) return;

         const fullMovies = await Promise.all(
            supabaseData.map((movie) => enrichMovieWithTmdb(movie)),
         );

         setMovies(fullMovies);
      } catch (error) {
         console.error("Erro geral:", error);
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      fetchMovies();
   }, [fetchMovies, sessionExists]);

   return { movies, loading, fetchMovies };
}
