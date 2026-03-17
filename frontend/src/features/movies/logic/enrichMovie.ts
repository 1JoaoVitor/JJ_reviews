import type { MovieData, TmdbProvider } from "@/types";

// Instancia fora da função para não recriar a cada filme 
const regionNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });

// só precisa garantir que tem tmdb_id. O resto pode ou não existir (ex: filmes de listas).
export interface BaseMovieRow {
   tmdb_id: number;
   id?: number; 
   status?: "watched" | "watchlist";
   rating?: number | null;
   review?: string | null;
   recommended?: string | null;
   location?: string | null;
   attachment_url?: string | null;
   created_at?: string;
   user_id?: string;
   list_type?: string;
   list_average_rating?: number;
   list_average_recommended?: string;
   // Usa unknown[] em vez de any[] porque, se precisar ler isso no Core, 
   // o TypeScript obriga a fazer a checagem de tipo (type narrowing).
   list_group_reviews?: unknown[];
}

export interface TmdbRawResponse {
   title?: string;
   overview?: string;
   poster_path?: string;
   runtime?: number;
   release_date?: string;
   genres?: { id: number; name: string }[];
   production_countries?: { iso_3166_1: string; name: string }[];
   credits?: {
      crew?: { job: string; name: string }[];
      cast?: { name: string }[];
   };
   "watch/providers"?: {
      results?: {
         BR?: {
            flatrate?: TmdbProvider[];
         };
      };
   };
}

export function mapTmdbToMovieData(
   supabaseRow: BaseMovieRow,
   tmdbData: TmdbRawResponse,
   oscarNomineesIds: number[] = []
): MovieData {
   
   const directors = tmdbData.credits?.crew
      ?.filter((p) => p.job === "Director")
      .map((d) => d.name)
      .join(", ") || "Desconhecido";

   const cast = tmdbData.credits?.cast
      ?.slice(0, 5)
      .map((c) => c.name) || [];

   const genres = tmdbData.genres?.map((g) => g.name) || [];

   const rawCountries = tmdbData.production_countries || [];
   
   // Tradução nativa e dinâmica com Intl.DisplayNames
   const translatedCountries = rawCountries.map((c) => {
      try {
         const translated = regionNames.of(c.iso_3166_1);
         return translated && translated !== c.iso_3166_1 ? translated : c.name;
      } catch {
         return c.name;
      }
   });

   const isNational = rawCountries.some((c) => c.iso_3166_1 === "BR");
   const isOscar = oscarNomineesIds.includes(supabaseRow.tmdb_id);

   const providers = tmdbData["watch/providers"]?.results?.BR?.flatrate || [];

   return {
      ...supabaseRow,
      title: tmdbData.title || "Título Desconhecido",
      overview: tmdbData.overview || "Sinopse indisponível.",
      poster_path: tmdbData.poster_path || "",
      release_date: tmdbData.release_date || "",
      runtime: tmdbData.runtime || 0,
      director: directors,
      cast,
      genres,
      countries: translatedCountries,
      isNational,
      isOscar,
      providers,
   } as MovieData;
}