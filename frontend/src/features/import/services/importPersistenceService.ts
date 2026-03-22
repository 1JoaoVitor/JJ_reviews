import {
  addMovieToListRecord,
  createListRecord,
  fetchListMovieIds,
  fetchOwnedLists,
} from "@/features/lists/services/listsService";
import { upsertPersonalReview } from "@/features/movies/services/moviePersistenceService";
import { supabase } from "@/lib/supabase";
import type { ImportCompleteResult, ProcessedImportData, ProcessedMovie } from "../types/importTypes";

interface PersistImportOptions {
  userId: string;
  processedData: ProcessedImportData;
}

function hasReviewData(movie: ProcessedMovie): boolean {
  return movie.rating !== undefined || !!movie.review || !!movie.recommended;
}

export async function persistImportedData(options: PersistImportOptions): Promise<ImportCompleteResult> {
  const startedAt = Date.now();
  const { userId, processedData } = options;
  const errors: string[] = [];

  const stats = {
    moviesImported: 0,
    diaryEntriesAdded: 0,
    listsCreated: 0,
    reviewsAdded: 0,
    watchedAdded: 0,
    watchlistAdded: 0,
    unmatchedMovies: processedData.stats.unmatchedMovies,
    unmatchedDiaryEntries: processedData.stats.unmatchedDiaryEntries,
    conflicts: 0,
    duration: 0,
  };

  const normalizeListName = (value: string) => value.trim().toLocaleLowerCase();
  const ownedLists = await fetchOwnedLists(userId);
  const existingListsByName = new Map(ownedLists.map((list) => [normalizeListName(list.name), list.id]));

  for (const movie of processedData.movies) {
    if (!movie.tmdbId) {
      stats.conflicts += 1;
      continue;
    }

    try {
      await upsertPersonalReview(userId, movie.tmdbId, {
        rating: movie.rating ?? null,
        review: movie.review ?? null,
        recommended: movie.recommended ?? null,
        runtime: 0,
        location: null,
        status: movie.status,
        attachment_url: null,
      });

      stats.moviesImported += 1;
      if (movie.status === "watched") {
        stats.watchedAdded += 1;
      } else {
        stats.watchlistAdded += 1;
      }

      if (hasReviewData(movie)) {
        stats.reviewsAdded += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown movie persistence error";
      errors.push(`Movie ${movie.name} (${movie.year}): ${message}`);
    }
  }

  for (const diaryEntry of processedData.diaryEntries || []) {
    if (!diaryEntry.tmdbId) {
      stats.conflicts += 1;
      continue;
    }

    try {
      const { error } = await supabase.from("diary_entries").upsert(
        {
          user_id: userId,
          tmdb_id: diaryEntry.tmdbId,
          watched_date: diaryEntry.watchedDate,
        },
        {
          onConflict: "user_id,tmdb_id,watched_date",
          ignoreDuplicates: true,
        }
      );

      if (error) {
        throw error;
      }

      stats.diaryEntriesAdded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown diary persistence error";
      errors.push(`Diary ${diaryEntry.name} (${diaryEntry.year}) @ ${diaryEntry.watchedDate}: ${message}`);
    }
  }

  for (const list of processedData.lists) {
    try {
      const normalizedName = normalizeListName(list.name);
      let targetListId = existingListsByName.get(normalizedName);

      if (!targetListId) {
        const createdList = await createListRecord({
          ownerId: userId,
          name: list.name,
          description: list.description || "",
          type: list.type,
          has_rating: false,
          rating_type: null,
          manual_rating: null,
          auto_sync: false,
        });

        targetListId = createdList.id;
        existingListsByName.set(normalizedName, targetListId);
        stats.listsCreated += 1;
      }

      const existingMovieIds = new Set<number>(await fetchListMovieIds(targetListId));
      const seenTmdbIds = new Set<number>();

      for (const movie of list.movies) {
        if (!movie.tmdbId) {
          stats.conflicts += 1;
          continue;
        }

        if (seenTmdbIds.has(movie.tmdbId) || existingMovieIds.has(movie.tmdbId)) {
          stats.conflicts += 1;
          continue;
        }

        seenTmdbIds.add(movie.tmdbId);
        existingMovieIds.add(movie.tmdbId);

        try {
          await addMovieToListRecord(targetListId, movie.tmdbId, userId);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown list movie persistence error";
          errors.push(`List ${list.name} -> Movie ${movie.name} (${movie.year}): ${message}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown list persistence error";
      errors.push(`List ${list.name}: ${message}`);
    }
  }

  stats.duration = Date.now() - startedAt;

  const success = errors.length === 0;

  return {
    success,
    stats,
    message: success
      ? "Importacao concluida com sucesso."
      : "Importacao concluida com avisos. Verifique os erros retornados.",
    unmatchedMovies: processedData.movies.filter((movie) => !movie.tmdbId),
    errors: success ? undefined : errors,
  };
}
