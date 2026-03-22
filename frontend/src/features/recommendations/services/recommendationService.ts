import { discoverMovies } from "@/features/movies/services/tmdbService";
import type { MovieData } from "@/types";

interface DiscoverCandidate {
   id: number;
   title?: string;
   release_date?: string;
   poster_path?: string | null;
   overview?: string;
   vote_average?: number;
   vote_count?: number;
   genre_ids?: number[];
}

export interface RecommendationItem {
   movie: MovieData;
   score: number;
   reasons: string[];
}

interface RecommendationProfile {
   favoriteGenreIds: number[];
   favoriteGenreLabels: string[];
   genreWeights: Map<number, number>;
   ratedMoviesCount: number;
}

const GENRE_LABEL_TO_ID: Record<string, number> = {
   action: 28,
   acao: 28,
   adventure: 12,
   aventura: 12,
   animation: 16,
   animacao: 16,
   comedy: 35,
   comedia: 35,
   crime: 80,
   documentary: 99,
   documentario: 99,
   drama: 18,
   family: 10751,
   familia: 10751,
   fantasy: 14,
   fantasia: 14,
   history: 36,
   historia: 36,
   horror: 27,
   terror: 27,
   music: 10402,
   musica: 10402,
   mystery: 9648,
   misterio: 9648,
   romance: 10749,
   fiction: 878,
   ficcao: 878,
   tvmovie: 10770,
   filmeparatv: 10770,
   thriller: 53,
   war: 10752,
   guerra: 10752,
   western: 37,
   faroeste: 37,
};

const GENRE_ID_TO_LABEL: Record<number, string> = {
   12: "Aventura",
   14: "Fantasia",
   16: "Animacao",
   18: "Drama",
   27: "Terror",
   28: "Acao",
   35: "Comedia",
   36: "Historia",
   37: "Faroeste",
   53: "Suspense",
   80: "Crime",
   99: "Documentario",
   878: "Ficcao cientifica",
   9648: "Misterio",
   10402: "Musica",
   10749: "Romance",
   10751: "Familia",
   10752: "Guerra",
   10770: "Filme para TV",
};

function normalizeGenreName(value: string): string {
   return value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z]/g, "");
}

function toWeight(rating?: number | null): number {
   if (typeof rating !== "number") {
      return 1;
   }

   return Math.max(0.5, rating - 1.5);
}

function buildProfile(movies: MovieData[]): RecommendationProfile {
   const ratedMovies = movies.filter((movie) => movie.status === "watched");
   const genreWeights = new Map<number, number>();

   for (const movie of ratedMovies) {
      const weight = toWeight(movie.rating);

      for (const genreName of movie.genres || []) {
         const genreId = GENRE_LABEL_TO_ID[normalizeGenreName(genreName)];
         if (!genreId) {
            continue;
         }

         genreWeights.set(genreId, (genreWeights.get(genreId) ?? 0) + weight);
      }
   }

   const sortedGenres = Array.from(genreWeights.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([genreId]) => genreId);

   return {
      favoriteGenreIds: sortedGenres,
      favoriteGenreLabels: sortedGenres.map((genreId) => GENRE_ID_TO_LABEL[genreId] || "Genero"),
      genreWeights,
      ratedMoviesCount: ratedMovies.length,
   };
}

function toRecommendedMovie(item: DiscoverCandidate): MovieData {
   return {
      id: -100000 - item.id,
      tmdb_id: item.id,
      rating: typeof item.vote_average === "number" ? Number(item.vote_average.toFixed(1)) : null,
      review: "",
      recommended: "Recomendado",
      created_at: new Date().toISOString(),
      title: item.title || "Filme recomendado",
      poster_path: item.poster_path || undefined,
      release_date: item.release_date || undefined,
      overview: item.overview || undefined,
      director: "Nao informado",
      status: "watchlist",
      genres: (item.genre_ids || []).map((genreId) => GENRE_ID_TO_LABEL[genreId]).filter(Boolean) as string[],
      countries: [],
      cast: [],
   };
}

function buildReasons(item: DiscoverCandidate, profile: RecommendationProfile): string[] {
   const reasons: string[] = [];
   const matchedGenres = (item.genre_ids || [])
      .filter((genreId) => profile.favoriteGenreIds.includes(genreId))
      .map((genreId) => GENRE_ID_TO_LABEL[genreId])
      .filter(Boolean)
      .slice(0, 2);

   if (matchedGenres.length > 0) {
      reasons.push(`Tem a sua cara em ${matchedGenres.join(" e ")}`);
   }

   if (typeof item.vote_average === "number" && item.vote_average >= 7.5) {
      reasons.push("Bem avaliado pela comunidade TMDB");
   }

   if (item.release_date) {
      const releaseYear = Number(item.release_date.split("-")[0]);
      if (!Number.isNaN(releaseYear) && releaseYear >= 2020) {
         reasons.push("Lancamento recente");
      }
   }

   if (reasons.length === 0) {
      reasons.push("Combinacao de popularidade e potencial para seu perfil");
   }

   return reasons;
}

function scoreCandidate(item: DiscoverCandidate, profile: RecommendationProfile): number {
   const genreScore = (item.genre_ids || []).reduce((sum, genreId) => sum + (profile.genreWeights.get(genreId) ?? 0), 0);
   const ratingScore = typeof item.vote_average === "number" ? item.vote_average : 0;
   const confidenceScore = typeof item.vote_count === "number" ? Math.min(item.vote_count / 1000, 2) : 0;

   return genreScore * 1.4 + ratingScore + confidenceScore;
}

async function fetchCandidatePool(profile: RecommendationProfile): Promise<DiscoverCandidate[]> {
   const requests: Promise<DiscoverCandidate[]>[] = [
      discoverMovies({ page: 1, sortBy: "popularity.desc", voteCountGte: 300 }),
      discoverMovies({ page: 2, sortBy: "popularity.desc", voteCountGte: 300 }),
   ];

   for (const genreId of profile.favoriteGenreIds.slice(0, 2)) {
      requests.push(discoverMovies({ page: 1, withGenres: [genreId], sortBy: "vote_average.desc", voteCountGte: 150 }));
      requests.push(discoverMovies({ page: 2, withGenres: [genreId], sortBy: "popularity.desc", voteCountGte: 150 }));
   }

   if (profile.favoriteGenreIds.length > 1) {
      requests.push(discoverMovies({ page: 1, withGenres: profile.favoriteGenreIds.slice(0, 2), sortBy: "popularity.desc", voteCountGte: 120 }));
   }

   const results = await Promise.all(requests);
   return results.flat();
}

export async function getPersonalizedRecommendations(movies: MovieData[], limit = 20): Promise<RecommendationItem[]> {
   const knownMovieIds = new Set(movies.map((movie) => movie.tmdb_id));
   const profile = buildProfile(movies);
   const candidates = await fetchCandidatePool(profile);

   const uniqueCandidates = candidates.filter(
      (candidate, index, arr) =>
         candidate.id > 0 &&
         !knownMovieIds.has(candidate.id) &&
         arr.findIndex((other) => other.id === candidate.id) === index,
   );

   if (profile.ratedMoviesCount === 0) {
      return uniqueCandidates.slice(0, limit).map((candidate) => ({
         movie: toRecommendedMovie(candidate),
         score: typeof candidate.vote_average === "number" ? candidate.vote_average : 0,
         reasons: ["Sugestao inicial baseada em filmes populares"],
      }));
   }

   const ranked = uniqueCandidates
      .map((candidate) => ({
         movie: toRecommendedMovie(candidate),
         score: scoreCandidate(candidate, profile),
         reasons: buildReasons(candidate, profile),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

   return ranked;
}

export function getFavoriteGenreLabels(movies: MovieData[]): string[] {
   return buildProfile(movies).favoriteGenreLabels;
}
