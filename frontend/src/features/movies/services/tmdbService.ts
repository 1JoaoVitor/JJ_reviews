import axios from "axios";
import { mapTmdbToMovieData, type TmdbRawResponse, type BaseMovieRow } from "@/features/movies";
import type { MovieData } from "@/types";
import { OSCAR_NOMINEES_IDS } from "@/constants/oscar";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

/**
 * Busca os detalhes completos de um filme no TMDB (créditos, provedores, etc.)
 * e mescla com os dados vindos do Supabase.
 */
export async function enrichMovieWithTmdb(
   movie: BaseMovieRow 
): Promise<MovieData> {
   try {
      const { data } = await axios.get<TmdbRawResponse>(
         `${BASE_URL}/movie/${movie.tmdb_id}?api_key=${API_KEY}&language=pt-BR&append_to_response=credits,watch/providers`
      );

      return mapTmdbToMovieData(movie, data, OSCAR_NOMINEES_IDS);
      
   } catch (err) {
      console.error(`Erro TMDB ID ${movie.tmdb_id}`, err);
      return { ...movie } as MovieData;
   }
}

/**
 * Busca filmes pelo nome no TMDB (para o modal de adição).
 */
export async function searchMovies(query: string) {
   try {
      const { data } = await axios.get(
         `${BASE_URL}/search/movie?api_key=${API_KEY}&language=pt-BR&query=${encodeURIComponent(query)}`
      );
      return data.results.slice(0, 5);
   } catch (err) {
      console.error("Erro ao buscar filmes no TMDB:", err);
      return [];
   }
}

// Busca detalhes extras de um filme específico (como a duração em minutos)
export const getMovieDetails = async (tmdbId: number) => {
   try {
      const response = await fetch(
         `${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&language=pt-BR`
      );
      if (!response.ok) throw new Error("Erro ao buscar detalhes do filme");
      
      const data = await response.json();
      return data; // Isso vai conter o campo 'runtime'
   } catch (error) {
      console.error(error);
      return null;
   }
};