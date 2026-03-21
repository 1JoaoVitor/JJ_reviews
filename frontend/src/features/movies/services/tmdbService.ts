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
         `${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&language=pt-BR&append_to_response=credits`
      );
      if (!response.ok) throw new Error("Erro ao buscar detalhes do filme");
      
      const data = await response.json();
      return data; // Isso vai conter o campo 'runtime'
   } catch (error) {
      console.error(error);
      return null;
   }
};

interface TmdbDiscoverMovieResult {
   id: number;
   title?: string;
   release_date?: string;
   poster_path?: string | null;
   overview?: string;
   vote_average?: number;
}

interface TmdbDiscoverResponse {
   results: TmdbDiscoverMovieResult[];
}

function buildSeed(source: string): number {
   let hash = 0;
   for (let i = 0; i < source.length; i += 1) {
      hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
   }
   return hash;
}

function toMovieDataFromDiscover(item: TmdbDiscoverMovieResult, dateKey: string): MovieData {
   return {
      id: -item.id,
      tmdb_id: item.id,
      rating: typeof item.vote_average === "number" ? Number(item.vote_average.toFixed(1)) : null,
      review: "",
      recommended: "",
      created_at: `${dateKey}T00:00:00.000Z`,
      title: item.title || "Sem titulo",
      poster_path: item.poster_path || undefined,
      release_date: item.release_date || undefined,
      overview: item.overview || undefined,
      director: "Nao informado",
      status: "watched",
      genres: [],
      countries: [],
      cast: [],
   };
}

export async function getDailyBattleTmdbPool(dateKey: string, count = 16): Promise<MovieData[]> {
   try {
      const baseSeed = buildSeed(`battle-daily-16|${dateKey}`);
      const startPage = (baseSeed % 8) + 1;
      const pages = [startPage, startPage + 1, startPage + 2].map((page) => ((page - 1) % 20) + 1);

      const responses = await Promise.all(
         pages.map((page) =>
            axios.get<TmdbDiscoverResponse>(
               `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=pt-BR&sort_by=popularity.desc&include_adult=false&include_video=false&vote_count.gte=250&page=${page}`
            )
         )
      );

      const pool = responses.flatMap((response) => response.data.results || []).filter((item) => item?.id && item.poster_path);
      const unique = pool.filter((item, index, arr) => arr.findIndex((other) => other.id === item.id) === index);

      if (unique.length === 0) {
         return [];
      }

      const picked: TmdbDiscoverMovieResult[] = [];
      const copy = [...unique];
      let cursor = baseSeed;

      while (picked.length < Math.min(count, copy.length)) {
         const idx = cursor % copy.length;
         picked.push(copy[idx]);
         copy.splice(idx, 1);
         cursor = (cursor * 17 + 11) >>> 0;
      }

      return picked.map((item) => toMovieDataFromDiscover(item, dateKey));
   } catch (error) {
      console.error("Erro ao montar pool diário da batalha via TMDB:", error);
      return [];
   }
}