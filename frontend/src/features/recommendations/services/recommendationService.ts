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

export interface RecommendationFeedbackProfile {
   genreAdjustments: Record<number, number>;
   dislikedMovieIds: number[];
}

interface RecommendationProfile {
   favoriteGenreIds: number[];
   favoriteGenreLabels: string[];
   genreWeights: Map<number, number>;
   decadeWeights: Map<number, number>;
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

export function getGenreIdFromLabel(label: string): number | null {
   return GENRE_LABEL_TO_ID[normalizeGenreName(label)] || null;
}

export function getGenreLabelFromId(genreId: number): string {
   return GENRE_ID_TO_LABEL[genreId] || "Gênero";
}

function toWeight(rating?: number | null): number {
   if (typeof rating !== "number") {
      return 0.25;
   }

   // Nota do usuário direciona o perfil: >=4 fortalece gênero, <=2.5 enfraquece.
   if (rating >= 4) {
      return (rating - 3) * 2;
   }

   if (rating <= 2.5) {
      return (rating - 3) * 2;
   }

   return 0;
}

function getDecadeFromReleaseDate(releaseDate?: string): number | null {
   if (!releaseDate) {
      return null;
   }

   const year = Number(releaseDate.split("-")[0]);
   if (Number.isNaN(year) || year < 1900) {
      return null;
   }

   return Math.floor(year / 10) * 10;
}

function buildProfile(movies: MovieData[], feedback?: RecommendationFeedbackProfile): RecommendationProfile {
   const ratedMovies = movies.filter((movie) => movie.status === "watched");
   const genreWeights = new Map<number, number>();
   const decadeWeights = new Map<number, number>();

   for (const movie of ratedMovies) {
      const weight = toWeight(movie.rating);

      for (const genreName of movie.genres || []) {
         const genreId = GENRE_LABEL_TO_ID[normalizeGenreName(genreName)];
         if (!genreId) {
            continue;
         }

         genreWeights.set(genreId, (genreWeights.get(genreId) ?? 0) + weight);
      }

      const decade = getDecadeFromReleaseDate(movie.release_date);
      if (decade) {
         decadeWeights.set(decade, (decadeWeights.get(decade) ?? 0) + weight);
      }
   }

   if (feedback?.genreAdjustments) {
      for (const [genreIdRaw, adjustment] of Object.entries(feedback.genreAdjustments)) {
         const genreId = Number(genreIdRaw);
         if (Number.isNaN(genreId) || typeof adjustment !== "number") {
            continue;
         }

         genreWeights.set(genreId, (genreWeights.get(genreId) ?? 0) + adjustment);
      }
   }

   const sortedGenres = Array.from(genreWeights.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([genreId]) => genreId);

   return {
      favoriteGenreIds: sortedGenres,
      favoriteGenreLabels: sortedGenres.map((genreId) => getGenreLabelFromId(genreId)),
      genreWeights,
      decadeWeights,
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
      director: "Não informado",
      status: "watchlist",
      genres: (item.genre_ids || []).map((genreId) => getGenreLabelFromId(genreId)),
      countries: [],
      cast: [],
   };
}

function buildReasons(item: DiscoverCandidate, profile: RecommendationProfile): string[] {
   const reasons: string[] = [];
   const matchedGenres = (item.genre_ids || [])
      .filter((genreId) => profile.favoriteGenreIds.includes(genreId))
      .map((genreId) => getGenreLabelFromId(genreId))
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
         reasons.push("Lançamento recente");
      }
   }

   if (reasons.length === 0) {
      reasons.push("Combinação de popularidade e potencial para seu perfil");
   }

   return reasons;
}

function scoreCandidate(item: DiscoverCandidate, profile: RecommendationProfile): number {
   const genreScore = (item.genre_ids || []).reduce((sum, genreId) => sum + (profile.genreWeights.get(genreId) ?? 0), 0);
   const candidateDecade = getDecadeFromReleaseDate(item.release_date);
   const decadeScore = candidateDecade ? (profile.decadeWeights.get(candidateDecade) ?? 0) : 0;
   const ratingScore = typeof item.vote_average === "number" ? item.vote_average : 0;
   const confidenceScore = typeof item.vote_count === "number" ? Math.min(item.vote_count / 2000, 1) : 0;

   // Predominantemente perfil do usuario; TMDB serve apenas como desempate leve.
   return genreScore * 2.4 + decadeScore * 1.2 + ratingScore * 0.35 + confidenceScore * 0.2;
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

export async function getPersonalizedRecommendations(
   movies: MovieData[],
   limit = 20,
   feedback?: RecommendationFeedbackProfile,
): Promise<RecommendationItem[]> {
   const knownMovieIds = new Set(movies.map((movie) => movie.tmdb_id));
   const profile = buildProfile(movies, feedback);
   const candidates = await fetchCandidatePool(profile);
   const dislikedMovieIds = new Set(feedback?.dislikedMovieIds || []);

   const uniqueCandidates = candidates.filter(
      (candidate, index, arr) =>
         candidate.id > 0 &&
         !knownMovieIds.has(candidate.id) &&
         !dislikedMovieIds.has(candidate.id) &&
         arr.findIndex((other) => other.id === candidate.id) === index,
   );

   if (profile.ratedMoviesCount === 0) {
      return uniqueCandidates.slice(0, limit).map((candidate) => ({
         movie: toRecommendedMovie(candidate),
         score: typeof candidate.vote_average === "number" ? candidate.vote_average : 0,
         reasons: ["Sugestão inicial baseada em filmes populares"],
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

export function getFavoriteGenreLabels(movies: MovieData[], feedback?: RecommendationFeedbackProfile): string[] {
   return buildProfile(movies, feedback).favoriteGenreLabels;
}
