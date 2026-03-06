import axios from "axios";
import type { TmdbCrew, TmdbCast, TmdbCountry, TmdbGenre, MovieData } from "@/types";
import { OSCAR_NOMINEES_IDS } from "@/constants/oscar";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

const regionNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });

/**
 * Busca os detalhes completos de um filme no TMDB (créditos, provedores, etc.)
 * e mescla com os dados vindos do Supabase.
 */
export async function enrichMovieWithTmdb(
   movie: Record<string, unknown> & { tmdb_id: number },
): Promise<MovieData> {
   try {
      const { data } = await axios.get(
         `${BASE_URL}/movie/${movie.tmdb_id}?api_key=${API_KEY}&language=pt-BR&append_to_response=credits,watch/providers`,
      );

      const watchProviders =
         data["watch/providers"]?.results?.BR?.flatrate || [];

      const directors = data.credits?.crew
         ?.filter((person: TmdbCrew) => person.job === "Director")
         .map((d: TmdbCrew) => d.name)
         .join(", ");

      const cast = data.credits?.cast
         ?.slice(0, 5)
         .map((c: TmdbCast) => c.name);

      const genres = data.genres?.map((g: TmdbGenre) => g.name) || [];

      const rawCountries: TmdbCountry[] = data.production_countries || [];

      const translatedCountries = rawCountries.map((c) => {
         try {
            return regionNames.of(c.iso_3166_1) ?? c.name;
         } catch {
            return c.name;
         }
      });

      const isBr = rawCountries.some((c) => c.iso_3166_1 === "BR");
      const isOscarNominee = OSCAR_NOMINEES_IDS.includes(movie.tmdb_id);

      return {
         ...movie,
         title: data.title,
         poster_path: data.poster_path,
         release_date: data.release_date,
         overview: data.overview,
         director: directors || "Desconhecido",
         cast: cast || [],
         countries: translatedCountries || [],
         genres,
         isNational: isBr,
         isOscar: isOscarNominee,
         providers: watchProviders,
      } as MovieData;
   } catch (err) {
      console.error(`Erro TMDB ID ${movie.tmdb_id}`, err);
      return movie as unknown as MovieData;
   }
}

/**
 * Busca filmes pelo nome no TMDB (para o modal de adição).
 */
export async function searchMovies(query: string) {
   try {
      const { data } = await axios.get(
         `${BASE_URL}/search/movie?api_key=${API_KEY}&language=pt-BR&query=${encodeURIComponent(query)}`,
      );
      return data.results.slice(0, 5);
   } catch (err) {
      console.error("Erro ao buscar filmes no TMDB:", err);
      return [];
   }
}
