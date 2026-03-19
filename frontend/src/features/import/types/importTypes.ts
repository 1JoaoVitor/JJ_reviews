/**
 * Import/Export Data Types
 * Defines all types needed for Letterboxd-compatible import/export
 */

export const IssueSeverity = {
  ERROR: "error",      // Blocks import
  WARNING: "warning",  // User can accept and continue
  INFO: "info",        // Informational only
} as const;

export type IssueSeverity = (typeof IssueSeverity)[keyof typeof IssueSeverity];

export const RatingScale = {
  SCALE_0_TO_10: "0-10",  // Convert 0-5 to 0-10 (multiply by 2)
  SCALE_1_TO_1: "1:1",    // Keep as-is (5 stays 5)
} as const;

export type RatingScale = (typeof RatingScale)[keyof typeof RatingScale];

export type ListType = "private" | "partial_shared" | "full_shared";

/* ─── FILE TYPES ─── */

export interface ProfileData {
  username: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  location?: string;
  website?: string;
  bio?: string;
  pronoun?: string;
  favoriteFilms?: string;
  dateJoined: string;
}

export interface RatingData {
  date: string;
  name: string;
  year: number;
  letterboxdUri?: string;
  rating: number; // 0-5 scale from Letterboxd
}

export interface ReviewData {
  date: string;
  name: string;
  year: number;
  letterboxdUri?: string;
  rating?: number;
  rewatch?: boolean;
  review?: string;
  tags?: string[];
  watchedDate?: string;
}

export interface WatchedMovieData {
  date: string;
  name: string;
  year: number;
  letterboxdUri?: string;
}

export interface WatchlistMovieData {
  date: string;
  name: string;
  year: number;
  letterboxdUri?: string;
}

export interface ListMovieData {
  position: number;
  name: string;
  year: number;
  letterboxdUri?: string;
  description?: string;
  tags?: string[];
}

export interface ListData {
  date: string;
  name: string;
  tags?: string[];
  letterboxdUri?: string;
  description?: string;
  movies: ListMovieData[];
}

/* ─── PARSED & PROCESSED DATA ─── */

export interface ImportFileSet {
  profile?: ProfileData;
  ratings: RatingData[];
  reviews: ReviewData[];
  watched: WatchedMovieData[];
  watchlist: WatchlistMovieData[];
  lists: ListData[];
}

export interface ProcessedMovie {
  name: string;
  year: number;
  tmdbId?: number; // Matched via TMDB
  rating?: number; // After scale conversion
  status: "watched" | "watchlist"; // Determined from source file
  review?: string;
  recommended?: string;
  letterboxdUri?: string;
  matchWarning?: string; // If TMDB match failed
}

export interface ProcessedList {
  id: string; // UUID generated on frontend
  name: string;
  description?: string;
  type: ListType; // User-selected during import
  movies: ProcessedMovie[];
  letterboxdUri?: string;
}

export interface ProcessedImportData {
  fileName: string;
  status: "success" | "partial" | "error";
  movies: ProcessedMovie[];
  lists: ProcessedList[];
  stats: {
    totalMovies: number;
    matchedMovies: number;
    unmatchedMovies: number;
    totalLists: number;
  };
}

/* ─── VALIDATION ─── */

export interface ValidationIssue {
  severity: IssueSeverity;
  section: "profile" | "ratings" | "reviews" | "watched" | "watchlist" | "lists";
  fileName?: string;
  lineNumber?: number;
  message: string;
  details?: unknown;
}

export interface ValidationResult {
  isValid: boolean; // true if no ERRORs (WARNINGs allowed)
  issues: ValidationIssue[];
  warnings: string[]; // Human-readable warning summary
  errors: string[];   // Human-readable error summary
  canProceed: boolean; // true if only WARNINGs or no issues
}

/* ─── SETTINGS & CONFIGURATION ─── */

export interface ImportSettings {
  ratingScale: RatingScale;
  listTypeMap: Record<string, ListType>; // listName → type
  skipUnmatchedMovies: boolean; // Default: true
}

/* ─── PROGRESS TRACKING ─── */

export interface ImportProgress {
  currentStep: "upload" | "validate" | "preview" | "confirm" | "progress" | "complete";
  processed: number;
  total: number;
  currentAction: string;
  percentComplete: number;
  etaSeconds?: number;
}

export interface ImportStats {
  moviesImported: number;
  listsCreated: number;
  reviewsAdded: number;
  watchedAdded: number;
  watchlistAdded: number;
  unmatchedMovies: number;
  conflicts: number;
  duration: number; // milliseconds
}

export interface ImportCompleteResult {
  success: boolean;
  stats: ImportStats;
  message: string;
  unmatchedMovies?: ProcessedMovie[];
  errors?: string[];
}

/* ─── FILE DETECTION ─── */

export interface DetectedFile {
  name: string;
  type: "profile" | "ratings" | "reviews" | "watched" | "watchlist" | "list" | "unknown";
  content: string;
  size: number;
  isValid: boolean;
  validationIssue?: string;
}

export interface DetectedFileSet {
  files: DetectedFile[];
  allValid: boolean;
  summary: {
    profileFiles: number;
    ratingFiles: number;
    reviewFiles: number;
    watchedFiles: number;
    watchlistFiles: number;
    listFiles: number;
  };
}

/* ─── TMDB MATCHING ─── */

export interface TmdbMatchResult {
  query: string; // "Title (Year)"
  tmdbId?: number;
  title?: string;
  year?: number;
  matched: boolean;
  confidence: number; // 0-100
  details?: {
    posterPath?: string;
    overview?: string;
    releaseDate?: string;
  };
}

export interface TmdbBatchMatchRequest {
  movies: Array<{ title: string; year: number }>;
  batchSize?: number;
}

export interface TmdbBatchMatchResult {
  successful: number;
  failed: number;
  results: Map<string, TmdbMatchResult>;
  cacheHits: number;
}
