/**
 * Import Pipeline Service
 * Connects the current flow: ZIP detection -> parse -> validation -> transformation
 */

import { IssueSeverity } from "../types/importTypes";
import { extractAndDetectZip } from "../utils/zipParser";
import { transformImportData } from "./importTransformationService";
import { parseImportCsvContent, validateImportFiles } from "./importValidationService";
import type {
  ImportFileSet,
  ImportSettings,
  ListData,
  ProfileData,
  RatingData,
  ReviewData,
  ValidationIssue,
  ValidationResult,
  WatchedMovieData,
  WatchlistMovieData,
  ProcessedImportData,
  DetectedFileSet,
} from "../types/importTypes";

export interface ImportPipelineResult {
  detected: DetectedFileSet;
  parsedData: Partial<ImportFileSet>;
  validation: ValidationResult;
  processedData: ProcessedImportData | null;
}

function fileTypeToSection(fileType: "profile" | "ratings" | "reviews" | "watched" | "watchlist" | "list" | "unknown"): ValidationIssue["section"] {
  if (fileType === "list") {
    return "lists";
  }

  if (fileType === "unknown") {
    return "lists";
  }

  return fileType;
}

function mapDetectionIssues(detected: DetectedFileSet): ValidationIssue[] {
  return detected.files
    .filter((file) => !file.isValid)
    .map((file) => ({
      severity: IssueSeverity.WARNING,
      section: fileTypeToSection(file.type),
      fileName: file.name,
      message: file.validationIssue || "Invalid file detected in ZIP",
    }));
}

export async function processImportZip(
  file: File,
  settings: ImportSettings
): Promise<ImportPipelineResult> {
  const detected = await extractAndDetectZip(file);

  const parsedData: Partial<ImportFileSet> = {
    ratings: [],
    reviews: [],
    watched: [],
    watchlist: [],
    lists: [],
  };

  for (const detectedFile of detected.files) {
    if (!detectedFile.isValid || detectedFile.type === "unknown") {
      continue;
    }

    if (detectedFile.type === "profile") {
      const parsed = (await parseImportCsvContent(detectedFile.content, "profile")) as ProfileData | null;
      if (parsed) {
        parsedData.profile = parsed;
      }
      continue;
    }

    if (detectedFile.type === "ratings") {
      const parsed = (await parseImportCsvContent(detectedFile.content, "ratings")) as RatingData[];
      parsedData.ratings = [...(parsedData.ratings || []), ...parsed];
      continue;
    }

    if (detectedFile.type === "reviews") {
      const parsed = (await parseImportCsvContent(detectedFile.content, "reviews")) as ReviewData[];
      parsedData.reviews = [...(parsedData.reviews || []), ...parsed];
      continue;
    }

    if (detectedFile.type === "watched") {
      const parsed = (await parseImportCsvContent(detectedFile.content, "watched")) as WatchedMovieData[];
      parsedData.watched = [...(parsedData.watched || []), ...parsed];
      continue;
    }

    if (detectedFile.type === "watchlist") {
      const parsed = (await parseImportCsvContent(detectedFile.content, "watchlist")) as WatchlistMovieData[];
      parsedData.watchlist = [...(parsedData.watchlist || []), ...parsed];
      continue;
    }

    if (detectedFile.type === "list") {
      const parsed = (await parseImportCsvContent(detectedFile.content, "list")) as ListData | null;
      if (parsed) {
        parsedData.lists = [...(parsedData.lists || []), parsed];
      }
    }
  }

  const baseValidation = await validateImportFiles(parsedData);
  const detectionIssues = mapDetectionIssues(detected);
  const issues = [...baseValidation.issues, ...detectionIssues];

  const errors = issues.filter((issue) => issue.severity === IssueSeverity.ERROR).map((issue) => issue.message);
  const warnings = issues.filter((issue) => issue.severity === IssueSeverity.WARNING).map((issue) => issue.message);

  const validation: ValidationResult = {
    isValid: errors.length === 0,
    canProceed: errors.length === 0,
    issues,
    errors,
    warnings,
  };

  const processedData = validation.canProceed
    ? await transformImportData({
        fileName: file.name,
        data: parsedData,
        settings,
      })
    : null;

  return {
    detected,
    parsedData,
    validation,
    processedData,
  };
}
