/**
 * Import Transformation Service (Phase 2)
 * Transforms parsed/validated import files into ProcessedImportData
 */

import { batchMatchMovies } from "../utils/movieMatcher";
import { getRatingBadge } from "@/utils/badges";
import { RatingScale } from "../types/importTypes";
import type {
  DiaryData,
  ImportFileSet,
  ImportSettings,
  ListData,
  ProcessedDiaryEntry,
  ProcessedImportData,
  ProcessedList,
  ProcessedMovie,
  TmdbMatchResult,
} from "../types/importTypes";

interface TransformOptions {
  fileName: string;
  data: Partial<ImportFileSet>;
  settings: ImportSettings;
  minMatchConfidence?: number;
}

interface MovieAccumulator {
  name: string;
  year: number;
  status: "watched" | "watchlist";
  rating?: number;
  review?: string;
  letterboxdUri?: string;
}

const DEFAULT_MATCH_CONFIDENCE = 70;
const DEFAULT_LIST_TYPE: ImportSettings["listTypeMap"][string] = "partial_shared";

function normalizeMovieKey(name: string, year: number): string {
  return `${name.trim().toLowerCase()}|${year}`;
}

function convertRating(rating: number | undefined, scale: ImportSettings["ratingScale"]): number | undefined {
  if (rating === undefined) {
    return undefined;
  }

  if (scale === RatingScale.SCALE_0_TO_10) {
    return Math.round(rating * 2 * 10) / 10;
  }

  return rating;
}

function upsertMovie(
  movieMap: Map<string, MovieAccumulator>,
  incoming: MovieAccumulator
): void {
  const key = normalizeMovieKey(incoming.name, incoming.year);
  const existing = movieMap.get(key);

  if (!existing) {
    movieMap.set(key, incoming);
    return;
  }

  const merged: MovieAccumulator = {
    ...existing,
    status: existing.status === "watched" || incoming.status === "watched" ? "watched" : "watchlist",
    rating: incoming.rating ?? existing.rating,
    review: incoming.review ?? existing.review,
    letterboxdUri: incoming.letterboxdUri ?? existing.letterboxdUri,
  };

  movieMap.set(key, merged);
}

function toProcessedMovie(
  source: MovieAccumulator,
  match: TmdbMatchResult | undefined,
  settings: ImportSettings,
  minConfidence: number
): ProcessedMovie | null {
  const isMatched = !!match?.matched && !!match?.tmdbId && match.confidence >= minConfidence;

  if (!isMatched && settings.skipUnmatchedMovies) {
    return null;
  }

  const convertedRating = convertRating(source.rating, settings.ratingScale);
  const recommendedBadge = getRatingBadge(convertedRating);

  return {
    name: source.name,
    year: source.year,
    status: source.status,
    rating: convertedRating,
    review: source.review,
    recommended: recommendedBadge,
    letterboxdUri: source.letterboxdUri,
    tmdbId: isMatched ? match.tmdbId : undefined,
    matchWarning: isMatched ? undefined : "Movie could not be matched with sufficient confidence",
  };
}

function toProcessedDiaryEntry(
  source: DiaryData,
  match: TmdbMatchResult | undefined,
  settings: ImportSettings,
  minConfidence: number
): ProcessedDiaryEntry | null {
  const isMatched = !!match?.matched && !!match?.tmdbId && match.confidence >= minConfidence;

  if (!isMatched && settings.skipUnmatchedMovies) {
    return null;
  }

  return {
    name: source.name,
    year: source.year,
    watchedDate: source.watchedDate,
    letterboxdUri: source.letterboxdUri,
    tmdbId: isMatched ? match.tmdbId : undefined,
    matchWarning: isMatched ? undefined : "Diary entry could not be matched with sufficient confidence",
  };
}

function buildBaseMovieMap(data: Partial<ImportFileSet>): Map<string, MovieAccumulator> {
  const movieMap = new Map<string, MovieAccumulator>();

  for (const movie of data.watched || []) {
    upsertMovie(movieMap, {
      name: movie.name,
      year: movie.year,
      status: "watched",
      letterboxdUri: movie.letterboxdUri,
    });
  }

  for (const movie of data.watchlist || []) {
    upsertMovie(movieMap, {
      name: movie.name,
      year: movie.year,
      status: "watchlist",
      letterboxdUri: movie.letterboxdUri,
    });
  }

  for (const rating of data.ratings || []) {
    upsertMovie(movieMap, {
      name: rating.name,
      year: rating.year,
      status: "watched",
      rating: rating.rating,
      letterboxdUri: rating.letterboxdUri,
    });
  }

  for (const entry of data.diary || []) {
    upsertMovie(movieMap, {
      name: entry.name,
      year: entry.year,
      status: "watched",
      rating: entry.rating,
      letterboxdUri: entry.letterboxdUri,
    });
  }

  for (const review of data.reviews || []) {
    upsertMovie(movieMap, {
      name: review.name,
      year: review.year,
      status: "watched",
      rating: review.rating,
      review: review.review,
      letterboxdUri: review.letterboxdUri,
    });
  }

  return movieMap;
}

function buildListMovieSources(
  list: ListData,
  watchedMovieKeys: Set<string>
): MovieAccumulator[] {
  return list.movies.map((movie) => ({
    name: movie.name,
    year: movie.year,
    status: watchedMovieKeys.has(normalizeMovieKey(movie.name, movie.year)) ? "watched" : "watchlist",
    letterboxdUri: movie.letterboxdUri,
  }));
}

function mapStatus(movies: ProcessedMovie[], diaryEntries: ProcessedDiaryEntry[]): ProcessedImportData["status"] {
  const unmatched = movies.filter((m) => m.matchWarning).length;
  const unmatchedDiary = diaryEntries.filter((entry) => entry.matchWarning).length;
  const totalItems = movies.length + diaryEntries.length;

  if (totalItems === 0) {
    return "error";
  }

  if (unmatched > 0 || unmatchedDiary > 0) {
    return "partial";
  }

  return "success";
}

export async function transformImportData(
  options: TransformOptions
): Promise<ProcessedImportData> {
  const { fileName, data, settings } = options;
  const minMatchConfidence = options.minMatchConfidence ?? DEFAULT_MATCH_CONFIDENCE;

  const baseMovieMap = buildBaseMovieMap(data);
  const watchedKeys = new Set(
    Array.from(baseMovieMap.values())
      .filter((movie) => movie.status === "watched")
      .map((movie) => normalizeMovieKey(movie.name, movie.year))
  );

  const allListMovieSources = (data.lists || []).flatMap((list) =>
    buildListMovieSources(list, watchedKeys)
  );

  const uniqueMatchInput = new Map<string, { title: string; year: number }>();

  for (const movie of baseMovieMap.values()) {
    uniqueMatchInput.set(normalizeMovieKey(movie.name, movie.year), {
      title: movie.name,
      year: movie.year,
    });
  }

  for (const movie of allListMovieSources) {
    uniqueMatchInput.set(normalizeMovieKey(movie.name, movie.year), {
      title: movie.name,
      year: movie.year,
    });
  }

  const matchResult = await batchMatchMovies({
    movies: Array.from(uniqueMatchInput.values()),
    batchSize: 50,
  });

  const processedMovies: ProcessedMovie[] = Array.from(baseMovieMap.values())
    .map((movie) => {
      const key = normalizeMovieKey(movie.name, movie.year);
      return toProcessedMovie(movie, matchResult.results.get(key), settings, minMatchConfidence);
    })
    .filter((movie): movie is ProcessedMovie => movie !== null);

  const processedDiaryEntries: ProcessedDiaryEntry[] = (data.diary || [])
    .map((entry) => {
      const key = normalizeMovieKey(entry.name, entry.year);
      return toProcessedDiaryEntry(entry, matchResult.results.get(key), settings, minMatchConfidence);
    })
    .filter((entry): entry is ProcessedDiaryEntry => entry !== null);

  const processedLists: ProcessedList[] = (data.lists || [])
    .flatMap((list) => {
      const transformedMovies = buildListMovieSources(list, watchedKeys)
        .map((movie) => {
          const key = normalizeMovieKey(movie.name, movie.year);
          return toProcessedMovie(movie, matchResult.results.get(key), settings, minMatchConfidence);
        })
        .filter((movie): movie is ProcessedMovie => movie !== null);

      if (transformedMovies.length === 0 && settings.skipUnmatchedMovies) {
        return [];
      }

      const processedList: ProcessedList = {
        id: crypto.randomUUID(),
        name: list.name,
        description: list.description,
        type: settings.listTypeMap[list.name] || DEFAULT_LIST_TYPE,
        movies: transformedMovies,
        letterboxdUri: list.letterboxdUri,
      };

      return [processedList];
    });

  const unmatchedMovies = processedMovies.filter((m) => m.matchWarning).length;
  const matchedMovies = processedMovies.length - unmatchedMovies;
  const unmatchedDiaryEntries = processedDiaryEntries.filter((entry) => entry.matchWarning).length;

  return {
    fileName,
    status: mapStatus(processedMovies, processedDiaryEntries),
    movies: processedMovies,
    diaryEntries: processedDiaryEntries,
    lists: processedLists,
    stats: {
      totalMovies: processedMovies.length,
      totalDiaryEntries: processedDiaryEntries.length,
      matchedMovies,
      unmatchedMovies,
      unmatchedDiaryEntries,
      totalLists: processedLists.length,
    },
  };
}
