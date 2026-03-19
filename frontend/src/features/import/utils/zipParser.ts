/**
 * ZIP File Parser & Auto-Detection
 * Extracts ZIP files and auto-detects Letterboxd export structure
 */

import type {
  DetectedFile,
  DetectedFileSet,
} from "../types/importTypes";

/**
 * Extract ZIP file and auto-detect included files
 * Returns structured DetectedFileSet with file types
 */
export async function extractAndDetectZip(file: File): Promise<DetectedFileSet> {
  try {
    // Dynamically import JSZip (for client-side ZIP handling)
    const { default: JSZip } = await import("jszip");

    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    const files: DetectedFile[] = [];

    // Iterate through ZIP files
    for (const [fileName, zipFile] of Object.entries(zipContent.files)) {
      // Skip directories
      if (zipFile.dir) continue;

      // Skip hidden/system files
      if (fileName.startsWith(".") || fileName.startsWith("__MACOSX")) {
        continue;
      }

      try {
        const content = await zipFile.async("text");

        // Detect file type
        const detectedFile = detectFileType(fileName, content);
        files.push(detectedFile);
      } catch (error) {
        files.push({
          name: fileName,
          type: "unknown",
          content: "",
          size: 0,
          isValid: false,
          validationIssue: `Failed to read file: ${String(error)}`,
        });
      }
    }

    if (files.length === 0) {
      throw new Error("ZIP file is empty or contains no readable files");
    }

    // Build summary
    const summary = {
      profileFiles: files.filter((f) => f.type === "profile").length,
      ratingFiles: files.filter((f) => f.type === "ratings").length,
      reviewFiles: files.filter((f) => f.type === "reviews").length,
      watchedFiles: files.filter((f) => f.type === "watched").length,
      watchlistFiles: files.filter((f) => f.type === "watchlist").length,
      listFiles: files.filter((f) => f.type === "list").length,
    };

    const allValid = files.every((f) => f.isValid);

    return {
      files,
      allValid,
      summary,
    };
  } catch (error) {
    throw new Error(`Failed to extract ZIP: ${String(error)}`);
  }
}

/**
 * Auto-detect file type based on name and content
 * Matches against known Letterboxd headers
 */
function detectFileType(fileName: string, content: string): DetectedFile {
  const lowerName = fileName.toLowerCase();
  const firstLine = content.split("\n")[0];
  const headerLine = content.split("\n").find((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith("Letterboxd");
  });

  // Profile detection
  if (
    lowerName.includes("profile") ||
    headerLine?.includes("Username") ||
    headerLine?.includes("Date Joined")
  ) {
    const validation = validateProfileCsv(headerLine || firstLine);
    return {
      name: fileName,
      type: "profile",
      content,
      size: content.length,
      isValid: validation.valid,
      validationIssue: validation.issue,
    };
  }

  // Ratings detection (Letterboxd standard)
  if (
    lowerName.includes("rating") ||
    headerLine?.includes("Rating") ||
    (headerLine?.includes("Name") && headerLine?.includes("Year") && headerLine?.includes("Rating"))
  ) {
    const validation = validateRatingsCsv(headerLine || firstLine);
    return {
      name: fileName,
      type: "ratings",
      content,
      size: content.length,
      isValid: validation.valid,
      validationIssue: validation.issue,
    };
  }

  // Reviews detection
  if (
    lowerName.includes("review") ||
    (headerLine?.includes("Review") && headerLine?.includes("Name"))
  ) {
    const validation = validateReviewsCsv(headerLine || firstLine);
    return {
      name: fileName,
      type: "reviews",
      content,
      size: content.length,
      isValid: validation.valid,
      validationIssue: validation.issue,
    };
  }

  // Watched detection
  if (
    lowerName.includes("watched") ||
    (headerLine?.includes("Name") && headerLine?.includes("Year") && lowerName.includes("watched"))
  ) {
    const validation = validateWatchedCsv(headerLine || firstLine);
    return {
      name: fileName,
      type: "watched",
      content,
      size: content.length,
      isValid: validation.valid,
      validationIssue: validation.issue,
    };
  }

  // Watchlist detection
  if (
    lowerName.includes("watchlist") ||
    (headerLine?.includes("Name") && headerLine?.includes("Year") && lowerName.includes("watchlist"))
  ) {
    const validation = validateWatchlistCsv(headerLine || firstLine);
    return {
      name: fileName,
      type: "watchlist",
      content,
      size: content.length,
      isValid: validation.valid,
      validationIssue: validation.issue,
    };
  }

  // List detection (Letterboxd list export format)
  if (
    lowerName.includes("list") ||
    headerLine?.includes("Position") ||
    headerLine?.includes("Letterboxd list export")
  ) {
    const validation = validateListCsv(headerLine || firstLine);
    return {
      name: fileName,
      type: "list",
      content,
      size: content.length,
      isValid: validation.valid,
      validationIssue: validation.issue,
    };
  }

  // Unknown file
  return {
    name: fileName,
    type: "unknown",
    content,
    size: content.length,
    isValid: false,
    validationIssue: "Could not determine file type",
  };
}

/* ─── HEADER VALIDATORS ─── */

function validateProfileCsv(
  headerLine: string
): { valid: boolean; issue?: string } {
  const required = ["Username"];
  const hasRequired = required.every((field) => headerLine.includes(field));

  if (!hasRequired) {
    return {
      valid: false,
      issue: `Missing required columns: ${required.join(", ")}`,
    };
  }

  return { valid: true };
}

function validateRatingsCsv(
  headerLine: string
): { valid: boolean; issue?: string } {
  const required = ["Name", "Year", "Rating"];
  const hasRequired = required.every((field) => headerLine.includes(field));

  if (!hasRequired) {
    return {
      valid: false,
      issue: `Missing required columns: ${required.join(", ")}`,
    };
  }

  return { valid: true };
}

function validateReviewsCsv(
  headerLine: string
): { valid: boolean; issue?: string } {
  const required = ["Name", "Year"];
  const hasRequired = required.every((field) => headerLine.includes(field));

  if (!hasRequired) {
    return {
      valid: false,
      issue: `Missing required columns: ${required.join(", ")}`,
    };
  }

  return { valid: true };
}

function validateWatchedCsv(
  headerLine: string
): { valid: boolean; issue?: string } {
  const required = ["Name", "Year"];
  const hasRequired = required.every((field) => headerLine.includes(field));

  if (!hasRequired) {
    return {
      valid: false,
      issue: `Missing required columns: ${required.join(", ")}`,
    };
  }

  return { valid: true };
}

function validateWatchlistCsv(
  headerLine: string
): { valid: boolean; issue?: string } {
  const required = ["Name", "Year"];
  const hasRequired = required.every((field) => headerLine.includes(field));

  if (!hasRequired) {
    return {
      valid: false,
      issue: `Missing required columns: ${required.join(", ")}`,
    };
  }

  return { valid: true };
}

function validateListCsv(
  headerLine: string
): { valid: boolean; issue?: string } {
  // List CSVs can have different formats, but should have "Name"
  const hasName = headerLine.includes("Name");

  if (!hasName) {
    return {
      valid: false,
      issue: "Missing required column: Name",
    };
  }

  return { valid: true };
}

/**
 * Extract list name from file structure
 * e.g., "lists/Top 10 Sci-Fi.csv" → "Top 10 Sci-Fi"
 */
export function extractListNameFromFileName(fileName: string): string {
  // Remove directory prefix (lists/)
  let baseName = fileName
    .split(/[/\\]/)
    .pop() || fileName;

  // Remove .csv extension
  baseName = baseName.replace(/\.csv$/i, "");

  // Clean up
  return baseName.trim();
}

/**
 * Check if file is a list CSV based on path
 */
export function isListFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return lowerName.includes("list") && lowerName.endsWith(".csv");
}
