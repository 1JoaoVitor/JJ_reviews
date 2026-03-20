import type { ListType, ProcessedImportData } from "../types/importTypes";

export interface DryRunListProjection {
  listId: string;
  listName: string;
  type: ListType;
  totalMovies: number;
  matchedMovies: number;
  unmatchedMovies: number;
  duplicateMovies: number;
  projectedInserts: number;
}

export interface ImportDryRunProjection {
  moviesWithMatch: number;
  unmatchedMovies: number;
  watchedCount: number;
  watchlistCount: number;
  projectedConflicts: number;
  byListType: Record<ListType, { lists: number; movies: number }>;
  lists: DryRunListProjection[];
}

export function buildImportDryRunProjection(
  processedData: ProcessedImportData,
  listTypeOverrides: Record<string, ListType>
): ImportDryRunProjection {
  const moviesWithMatch = processedData.movies.filter((movie) => !!movie.tmdbId);
  const unmatchedMovies = processedData.movies.length - moviesWithMatch.length;
  const watchedCount = moviesWithMatch.filter((movie) => movie.status === "watched").length;
  const watchlistCount = moviesWithMatch.length - watchedCount;

  const byListType: Record<ListType, { lists: number; movies: number }> = {
    private: { lists: 0, movies: 0 },
    partial_shared: { lists: 0, movies: 0 },
    full_shared: { lists: 0, movies: 0 },
  };

  const lists: DryRunListProjection[] = processedData.lists.map((list) => {
    const type = listTypeOverrides[list.id] || list.type;
    const seen = new Set<number>();

    let matched = 0;
    let unmatched = 0;
    let duplicates = 0;

    for (const movie of list.movies) {
      if (!movie.tmdbId) {
        unmatched += 1;
        continue;
      }

      matched += 1;

      if (seen.has(movie.tmdbId)) {
        duplicates += 1;
      } else {
        seen.add(movie.tmdbId);
      }
    }

    const projectedInserts = matched - duplicates;

    byListType[type].lists += 1;
    byListType[type].movies += projectedInserts;

    return {
      listId: list.id,
      listName: list.name,
      type,
      totalMovies: list.movies.length,
      matchedMovies: matched,
      unmatchedMovies: unmatched,
      duplicateMovies: duplicates,
      projectedInserts,
    };
  });

  const listConflicts = lists.reduce((sum, list) => sum + list.unmatchedMovies + list.duplicateMovies, 0);

  return {
    moviesWithMatch: moviesWithMatch.length,
    unmatchedMovies,
    watchedCount,
    watchlistCount,
    projectedConflicts: unmatchedMovies + listConflicts,
    byListType,
    lists,
  };
}
