/**
 * Import Validation Service
 * Validates parsed CSV files and performs TMDB matching
 */

import { parseCsv, getField, getNumericField, getDateField } from "../utils/csvParser";
import { batchMatchMovies } from "../utils/movieMatcher";
import {
  ValidationIssue,
  ValidationResult,
  IssueSeverity,
  ProfileData,
  RatingData,
  ReviewData,
  WatchedMovieData,
  WatchlistMovieData,
  ListMovieData,
  ListData,
  ImportFileSet,
} from "../types/importTypes";

/**
 * Main validation function
 * Validates all files and performs TMDB matching
 */
export async function validateImportFiles(
  fileSet: Partial<ImportFileSet>
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  // Validate each file type
  if (fileSet.profile) {
    const profileIssues = validateProfileData(fileSet.profile);
    issues.push(...profileIssues);
  }

  if (fileSet.ratings && fileSet.ratings.length > 0) {
    const ratingIssues = validateRatingsData(fileSet.ratings);
    issues.push(...ratingIssues);

    // Perform TMDB matching on ratings
    const tmdbIssues = await validateTmdbMatching(
      fileSet.ratings.map((r) => ({ title: r.name, year: r.year }))
    );
    issues.push(...tmdbIssues);
  }

  if (fileSet.watched && fileSet.watched.length > 0) {
    const watchedIssues = validateWatchedData(fileSet.watched);
    issues.push(...watchedIssues);
  }

  if (fileSet.watchlist && fileSet.watchlist.length > 0) {
    const watchlistIssues = validateWatchlistData(fileSet.watchlist);
    issues.push(...watchlistIssues);
  }

  if (fileSet.lists && fileSet.lists.length > 0) {
    const listIssues = validateListsData(fileSet.lists);
    issues.push(...listIssues);
  }

  // Compile results
  const errors = issues.filter((i) => i.severity === IssueSeverity.ERROR);
  const warnings = issues.filter((i) => i.severity === IssueSeverity.WARNING);

  const isValid = errors.length === 0;
  const canProceed = isValid; // Allow WARNINGs, but block on ERRORs

  return {
    isValid,
    issues,
    warnings: warnings.map((w) => w.message),
    errors: errors.map((e) => e.message),
    canProceed,
  };
}

/**
 * Parse CSV content into typed data
 */
export async function parseImportCsvContent(
  csvContent: string,
  fileType: "profile" | "ratings" | "reviews" | "watched" | "watchlist" | "list"
) {
  const { rows, errors } = parseCsv(csvContent);

  if (errors.length > 0) {
    throw new Error(`CSV parsing errors: ${errors.join("; ")}`);
  }

  switch (fileType) {
    case "profile":
      return parseProfileCsv(rows);

    case "ratings":
      return parseRatingsCsv(rows);

    case "reviews":
      return parseReviewsCsv(rows);

    case "watched":
      return parseWatchedCsv(rows);

    case "watchlist":
      return parseWatchlistCsv(rows);

    case "list":
      return parseListCsv(rows);

    default:
      throw new Error(`Unknown file type: ${fileType}`);
  }
}

/* ─── PARSER FUNCTIONS ─── */

function parseProfileCsv(rows: Record<string, string>[]): ProfileData | null {
  if (rows.length === 0) return null;

  const row = rows[0];

  const { value: username, error: usernameError } = getField(row, "Username", {
    required: true,
  });

  if (usernameError || !username) {
    throw new Error("Profile: Missing username");
  }

  const { value: dateJoined } = getDateField(row, "Date Joined", {
    fallback: new Date().toISOString(),
  });

  return {
    username,
    givenName: getField(row, "Given Name").value || undefined,
    familyName: getField(row, "Family Name").value || undefined,
    email: getField(row, "Email Address").value || undefined,
    location: getField(row, "Location").value || undefined,
    website: getField(row, "Website").value || undefined,
    bio: getField(row, "Bio").value || undefined,
    pronoun: getField(row, "Pronoun").value || undefined,
    favoriteFilms: getField(row, "Favorite Films").value || undefined,
    dateJoined,
  };
}

function parseRatingsCsv(rows: Record<string, string>[]): RatingData[] {
  return rows
    .map((row) => {
      const { value: name, error: nameError } = getField(row, "Name", { required: true });
      const { value: year, error: yearError } = getNumericField(row, "Year", {
        required: true,
        min: 1800,
        max: 2100,
      });
      const { value: rating, error: ratingError } = getNumericField(row, "Rating", {
        required: true,
        min: 0,
        max: 5,
      });

      if (nameError || !name || yearError || !year || ratingError || rating === null) {
        return null; // Skip invalid rows
      }

      const { value: date } = getDateField(row, "Date");
      const { value: letterboxdUri } = getField(row, "Letterboxd URI");

      return {
        date: date || new Date().toISOString(),
        name,
        year,
        rating,
        letterboxdUri: letterboxdUri || undefined,
      };
    })
    .filter((item): item is RatingData => item !== null);
}

function parseReviewsCsv(rows: Record<string, string>[]): ReviewData[] {
  return rows
    .map((row) => {
      const { value: name, error: nameError } = getField(row, "Name", { required: true });
      const { value: year, error: yearError } = getNumericField(row, "Year", {
        required: true,
        min: 1800,
        max: 2100,
      });

      if (nameError || !name || yearError || !year) {
        return null;
      }

      const { value: date } = getDateField(row, "Date");
      const { value: rating } = getNumericField(row, "Rating", {
        min: 0,
        max: 5,
      });
      const { value: review } = getField(row, "Review");
      const { value: rewatch } = getField(row, "Rewatch");
      const { value: tags } = getField(row, "Tags");
      const { value: letterboxdUri } = getField(row, "Letterboxd URI");

      return {
        date: date || new Date().toISOString(),
        name,
        year,
        rating: rating || undefined,
        review: review || undefined,
        rewatch: rewatch?.toLowerCase() === "yes",
        tags: tags ? tags.split(",").map((t) => t.trim()) : undefined,
        letterboxdUri: letterboxdUri || undefined,
      };
    })
    .filter((item): item is ReviewData => item !== null);
}

function parseWatchedCsv(rows: Record<string, string>[]): WatchedMovieData[] {
  return rows
    .map((row) => {
      const { value: name } = getField(row, "Name", { required: true });
      const { value: year } = getNumericField(row, "Year", {
        required: true,
        min: 1800,
        max: 2100,
      });

      if (!name || !year) return null;

      const { value: date } = getDateField(row, "Date");
      const { value: letterboxdUri } = getField(row, "Letterboxd URI");

      return {
        date: date || new Date().toISOString(),
        name,
        year,
        letterboxdUri: letterboxdUri || undefined,
      };
    })
    .filter((item): item is WatchedMovieData => item !== null);
}

function parseWatchlistCsv(rows: Record<string, string>[]): WatchlistMovieData[] {
  return rows
    .map((row) => {
      const { value: name } = getField(row, "Name", { required: true });
      const { value: year } = getNumericField(row, "Year", {
        required: true,
        min: 1800,
        max: 2100,
      });

      if (!name || !year) return null;

      const { value: date } = getDateField(row, "Date");
      const { value: letterboxdUri } = getField(row, "Letterboxd URI");

      return {
        date: date || new Date().toISOString(),
        name,
        year,
        letterboxdUri: letterboxdUri || undefined,
      };
    })
    .filter((item): item is WatchlistMovieData => item !== null);
}

function parseListCsv(rows: Record<string, string>[]): ListData | null {
  if (rows.length === 0) return null;

  const firstRow = rows[0];

  // Check if this is metadata row or data row
  const isMetadataRow =
    getField(firstRow, "Date").value || getField(firstRow, "Name").value;

  let listName = "";
  let listDescription = "";
  let dataStartIndex = 0;

  if (isMetadataRow && getField(firstRow, "Position").value === null) {
    // First row is metadata
    listName = getField(firstRow, "Name").value || "Imported List";
    listDescription = getField(firstRow, "Description").value || "";
    dataStartIndex = 1;
  } else {
    // No metadata, use default
    listName = "Imported List";
    dataStartIndex = 0;
  }

  // Parse movie rows
  const movies: ListMovieData[] = rows
    .slice(dataStartIndex)
    .map((row) => {
      const { value: position } = getNumericField(row, "Position");
      const { value: name } = getField(row, "Name", { required: true });
      const { value: year } = getNumericField(row, "Year", {
        required: true,
        min: 1800,
        max: 2100,
      });

      if (!name || !year) return null;

      const { value: description } = getField(row, "Description");
      const { value: tags } = getField(row, "Tags");
      const { value: letterboxdUri } = getField(row, "URL");

      return {
        position: position || 0,
        name,
        year,
        description: description || undefined,
        tags: tags ? tags.split(",").map((t) => t.trim()) : undefined,
        letterboxdUri: letterboxdUri || undefined,
      };
    })
    .filter((item): item is ListMovieData => item !== null)
    // Re-sort by position if available
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  return {
    date: new Date().toISOString(),
    name: listName,
    description: listDescription || undefined,
    movies,
  };
}

/* ─── VALIDATION FUNCTIONS ─── */

function validateProfileData(profile: ProfileData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!profile.username || profile.username.trim().length === 0) {
    issues.push({
      severity: IssueSeverity.ERROR,
      section: "profile",
      message: "Profile username is required",
    });
  }

  return issues;
}

function validateRatingsData(ratings: RatingData[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  ratings.forEach((rating, i) => {
    if (!rating.name || rating.name.trim().length === 0) {
      issues.push({
        severity: IssueSeverity.WARNING,
        section: "ratings",
        lineNumber: i + 2, // +2 for header + 0-indexed
        message: `Rating ${i + 1}: Missing movie name`,
      });
    }

    if (!rating.year || rating.year < 1800 || rating.year > 2100) {
      issues.push({
        severity: IssueSeverity.WARNING,
        section: "ratings",
        lineNumber: i + 2,
        message: `Rating ${i + 1}: Invalid year`,
      });
    }

    if (rating.rating < 0 || rating.rating > 5) {
      issues.push({
        severity: IssueSeverity.WARNING,
        section: "ratings",
        lineNumber: i + 2,
        message: `Rating ${i + 1}: Rating must be 0-5, got ${rating.rating}`,
      });
    }
  });

  return issues;
}

function validateWatchedData(watched: WatchedMovieData[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  watched.forEach((movie, i) => {
    if (!movie.name || movie.name.trim().length === 0) {
      issues.push({
        severity: IssueSeverity.WARNING,
        section: "watched",
        lineNumber: i + 2,
        message: `Movie ${i + 1}: Missing name`,
      });
    }

    if (movie.year < 1800 || movie.year > 2100) {
      issues.push({
        severity: IssueSeverity.WARNING,
        section: "watched",
        lineNumber: i + 2,
        message: `Movie ${i + 1}: Invalid year`,
      });
    }
  });

  return issues;
}

function validateWatchlistData(watchlist: WatchlistMovieData[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  watchlist.forEach((movie, i) => {
    if (!movie.name || movie.name.trim().length === 0) {
      issues.push({
        severity: IssueSeverity.WARNING,
        section: "watchlist",
        lineNumber: i + 2,
        message: `Movie ${i + 1}: Missing name`,
      });
    }

    if (movie.year < 1800 || movie.year > 2100) {
      issues.push({
        severity: IssueSeverity.WARNING,
        section: "watchlist",
        lineNumber: i + 2,
        message: `Movie ${i + 1}: Invalid year`,
      });
    }
  });

  return issues;
}

function validateListsData(lists: ListData[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  lists.forEach((list, listIdx) => {
    if (!list.name || list.name.trim().length === 0) {
      issues.push({
        severity: IssueSeverity.WARNING,
        section: "lists",
        message: `List ${listIdx + 1}: Missing name`,
      });
    }

    list.movies.forEach((movie, movieIdx) => {
      if (!movie.name || movie.name.trim().length === 0) {
        issues.push({
          severity: IssueSeverity.WARNING,
          section: "lists",
          message: `List "${list.name}" movie ${movieIdx + 1}: Missing name`,
        });
      }

      if (movie.year < 1800 || movie.year > 2100) {
        issues.push({
          severity: IssueSeverity.WARNING,
          section: "lists",
          message: `List "${list.name}" movie ${movieIdx + 1}: Invalid year`,
        });
      }
    });
  });

  return issues;
}

async function validateTmdbMatching(
  movies: Array<{ title: string; year: number }>
): Promise<ValidationIssue[]> {
  if (movies.length === 0) return [];

  const issues: ValidationIssue[] = [];

  try {
    const matchResult = await batchMatchMovies({
      movies,
      batchSize: 50,
    });

    // Log unmatched movies as warnings
    if (matchResult.failed > 0) {
      issues.push({
        severity: IssueSeverity.WARNING,
        section: "ratings",
        message: `${matchResult.failed} movies could not be matched in TMDB. They will be skipped during import.`,
        details: {
          unmatchedCount: matchResult.failed,
          cacheHits: matchResult.cacheHits,
        },
      });
    }
  } catch (error) {
    issues.push({
      severity: IssueSeverity.WARNING,
      section: "ratings",
      message: `TMDB matching failed: ${String(error)}. Movies will be matched individually during import.`,
    });
  }

  return issues;
}
