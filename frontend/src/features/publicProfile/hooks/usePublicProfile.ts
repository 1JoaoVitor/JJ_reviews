import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { enrichMovieWithTmdb } from "@/features/movies/services/tmdbService";
import type { MovieData } from "@/types";

export function usePublicProfile(username: string | undefined) {
   const [movies, setMovies] = useState<MovieData[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState("");
   const [profileName, setProfileName] = useState("");

   const fetchPublicMovies = useCallback(async () => {
      if (!username) return;
      setLoading(true);
      setError("");

      try {
         //  Busca o ID do usuário através do username
         const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, username")
            .eq("username", username)
            .single();

         if (profileError || !profileData) {
            throw new Error("Usuário não encontrado.");
         }

         setProfileName(profileData.username);

         // Busca os filmes usando o ID desse usuário
         const { data: reviewsData, error: reviewsError } = await supabase
            .from("reviews")
            .select("*")
            .eq("user_id", profileData.id)
            .order("created_at", { ascending: false });

         if (reviewsError) throw reviewsError;
         if (!reviewsData) return;

         // 3Enriquecemos os dados com os posteres do TMDB
         const fullMovies = await Promise.all(
            reviewsData.map((movie) => enrichMovieWithTmdb(movie)),
         );

         setMovies(fullMovies);
      } catch (err) {
            if (err instanceof Error) {
                setError(err.message || "Erro ao carregar o perfil.");
            } else {
                setError("Ocorreu um erro desconhecido.");
            }
      } finally {
         setLoading(false);
      }
   }, [username]);

   useEffect(() => {
      fetchPublicMovies();
   }, [fetchPublicMovies]);

   return { movies, loading, error, profileName };
}