/**
 * Movie Matcher Service
 * Matches movie titles from CSV to TMDB API with caching
 * Handles batch queries and rate limiting
 */

import { TmdbMatchResult, TmdbBatchMatchRequest, TmdbBatchMatchResult } from "../types/importTypes";

// Simple in-memory cache for TMDB matches (session-scoped)
const matchCache = new Map<string, TmdbMatchResult>();

interface TmdbSearchResult {
  results: Array<{
    id: number;
    title: string;
    release_date: string;
  }>;
}

/**
 * Search TMDB for a single movie (title + year)
 * Returns TMDB ID if found, with confidence score
 */
export async function searchMovieInTmdb(
  title: string,
  year?: number,
  apiKey?: string
): Promise<TmdbMatchResult> {
  const query = `${title} (${year || "N/A"})`;
  const cacheKey = `${title.toLowerCase()}|${year || ""}`;

  // Check cache first
  if (matchCache.has(cacheKey)) {
    return matchCache.get(cacheKey)!;
  }

  try {
    const key = apiKey || import.meta.env.VITE_TMDB_API_KEY;

    if (!key) {
      console.warn("TMDB API key not configured. Movie matching disabled.");
      return {
        query,
        matched: false,
        confidence: 0,
        details: undefined,
      };
    }

    // Build search URL with year filter
    const params = new URLSearchParams({
      api_key: key,
      query: title,
      ...(year && { primary_release_year: year.toString() }),
    });

    const response = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`);

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = (await response.json()) as TmdbSearchResult;

    if (!data.results || data.results.length === 0) {
      const result: TmdbMatchResult = {
        query,
        matched: false,
        confidence: 0,
      };
      matchCache.set(cacheKey, result);
      return result;
    }

    // Find best match
    const bestMatch = data.results[0];
    const matchYear = new Date(bestMatch.release_date).getFullYear();
    const yearMatch = !year || matchYear === year;

    // Calculate confidence
    const titleMatch = bestMatch.title.toLowerCase() === title.toLowerCase() ? 1 : 0.8;
    const confidence = yearMatch ? titleMatch * 100 : titleMatch * 75;

    const result: TmdbMatchResult = {
      query,
      tmdbId: bestMatch.id,
      title: bestMatch.title,
      year: matchYear,
      matched: true,
      confidence: Math.round(confidence),
      details: {
        posterPath: bestMatch.release_date,
        releaseDate: bestMatch.release_date,
      },
    };

    matchCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`Failed to match movie "${query}":`, error);
    const result: TmdbMatchResult = {
      query,
      matched: false,
      confidence: 0,
    };
    matchCache.set(cacheKey, result);
    return result;
  }
}

/**
 * Batch match multiple movies (respects rate limiting)
 * Max 50 movies per batch to avoid rate limit (40 req/10s)
 */
export async function batchMatchMovies(
  request: TmdbBatchMatchRequest,
  apiKey?: string
): Promise<TmdbBatchMatchResult> {
  const { movies, batchSize = 50 } = request;

  if (movies.length === 0) {
    return {
      successful: 0,
      failed: 0,
      results: new Map(),
      cacheHits: 0,
    };
  }

  const results = new Map<string, TmdbMatchResult>();
  let cacheHits = 0;
  let successful = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);

    // Build requests
    const requests = batch.map((movie) => {
      const cacheKey = `${movie.title.toLowerCase()}|${movie.year || ""}`;

      // Check cache first
      if (matchCache.has(cacheKey)) {
        cacheHits++;
        const cachedResult = matchCache.get(cacheKey)!;
        results.set(cacheKey, cachedResult);
        return null; // Skip API call
      }

      return searchMovieInTmdb(movie.title, movie.year, apiKey);
    });

    // Execute requests (filter out null cached results)
    const validRequests = requests.filter((r) => r !== null) as Promise<TmdbMatchResult>[];

    if (validRequests.length > 0) {
      const batchResults = await Promise.allSettled(validRequests);

      batchResults.forEach((result, index) => {
        const originalMovie = batch[index];
        const cacheKey = `${originalMovie.title.toLowerCase()}|${originalMovie.year || ""}`;

        if (result.status === "fulfilled") {
          results.set(cacheKey, result.value);
          if (result.value.matched) {
            successful++;
          } else {
            failed++;
          }
        } else {
          failed++;
          results.set(cacheKey, {
            query: `${originalMovie.title} (${originalMovie.year || "N/A"})`,
            matched: false,
            confidence: 0,
          });
        }
      });
    }

    // Rate limiting: wait between batches (TMDB: 40 req/10s max)
    if (i + batchSize < movies.length) {
      await new Promise((resolve) => setTimeout(resolve, 250)); // 250ms between batches
    }
  }

  return {
    successful,
    failed,
    results,
    cacheHits,
  };
}

/**
 * Clear the match cache (for testing or fresh import)
 */
export function clearMatchCache(): void {
  matchCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  entries: string[];
} {
  return {
    size: matchCache.size,
    entries: Array.from(matchCache.keys()),
  };
}

/**
 * Determine if match is "good enough" for import
 * Confidence threshold: >= 70 is considered good
 */
export function isMatchGoodEnough(result: TmdbMatchResult, threshold = 70): boolean {
  return result.matched && result.confidence >= threshold;
}

/**
 * Format match result for display
 */
export function formatMatchResult(result: TmdbMatchResult): string {
  if (result.matched) {
    return `✓ ${result.title} (${result.year}) - ${result.confidence}% match`;
  }
  return `✗ No match found for "${result.query}"`;
}
