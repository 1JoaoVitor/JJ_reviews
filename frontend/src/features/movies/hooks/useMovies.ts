import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { enrichMovieWithTmdb } from "@/features/movies/services/tmdbService";
import type { MovieData } from "@/types";
import type { Session } from "@supabase/supabase-js";

/**
 * Hook que gerencia o carregamento dos filmes do Supabase
 * e o enriquecimento com dados do TMDB.
 */
export function useMovies(session: Session | null) {
   const [movies, setMovies] = useState<MovieData[]>([]);
   const [loading, setLoading] = useState(true);
   const hasFetchedOnce = useRef(false);

   const fetchMovies = useCallback(async () => {
      if (!session?.user.id) {
         setLoading(false); 
         return; 
      }

      // Só mostra skeleton no primeiro carregamento (refresh silencioso se já tem dados)
      if (!hasFetchedOnce.current) {
         setLoading(true);
      }

      try {
         const { data: supabaseData, error } = await supabase
            .from("reviews")
            .select("*")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false });

         if (error) throw error;
         if (!supabaseData) return;

         const fullMovies = await Promise.all(
            supabaseData.map((movie) => enrichMovieWithTmdb(movie)),
         );

         setMovies(fullMovies);
         hasFetchedOnce.current = true;
      } catch (error) {
         console.error("Erro geral:", error);
      } finally {
         setLoading(false);
      }
   }, [session]);

   useEffect(() => {
      if (!session) {
         setMovies([]);
         setLoading(false);
         hasFetchedOnce.current = false;
      } else {
         fetchMovies();
      }
   }, [session, fetchMovies]);

   return { movies, loading, fetchMovies };
}
