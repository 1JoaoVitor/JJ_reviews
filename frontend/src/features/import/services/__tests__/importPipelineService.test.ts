import { describe, it, expect, beforeEach, vi } from "vitest";
import { RatingScale } from "../../types/importTypes";
import { processImportZip } from "../importPipelineService";

vi.mock("../../utils/zipParser", () => ({
  extractAndDetectZip: vi.fn(),
}));

vi.mock("../importValidationService", () => ({
  parseImportCsvContent: vi.fn(),
  validateImportFiles: vi.fn(),
}));

vi.mock("../importTransformationService", () => ({
  transformImportData: vi.fn(),
}));

const { extractAndDetectZip } = await import("../../utils/zipParser");
const { parseImportCsvContent, validateImportFiles } = await import("../importValidationService");
const { transformImportData } = await import("../importTransformationService");

const settings = {
  ratingScale: RatingScale.SCALE_1_TO_1,
  listTypeMap: {},
  skipUnmatchedMovies: false,
};

describe("importPipelineService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should connect detect, parse, validate and transform flow", async () => {
    vi.mocked(extractAndDetectZip).mockResolvedValue({
      files: [
        { name: "ratings.csv", type: "ratings", content: "csv-ratings", size: 10, isValid: true },
        { name: "watched.csv", type: "watched", content: "csv-watched", size: 10, isValid: true },
      ],
      allValid: true,
      summary: {
        profileFiles: 0,
        ratingFiles: 1,
        reviewFiles: 0,
        watchedFiles: 1,
        watchlistFiles: 0,
        listFiles: 0,
      },
    });

    vi.mocked(parseImportCsvContent)
      .mockResolvedValueOnce([{ date: "2024-01-01", name: "The Matrix", year: 1999 }])
      .mockResolvedValueOnce([{ date: "2024-01-01", name: "The Matrix", year: 1999 }]);

    vi.mocked(validateImportFiles).mockResolvedValue({
      isValid: true,
      canProceed: true,
      issues: [],
      errors: [],
      warnings: [],
    });

    vi.mocked(transformImportData).mockResolvedValue({
      fileName: "letterboxd.zip",
      status: "success",
      movies: [],
      lists: [],
      stats: {
        totalMovies: 0,
        matchedMovies: 0,
        unmatchedMovies: 0,
        totalLists: 0,
      },
    });

    const file = new File(["zip"], "letterboxd.zip", { type: "application/zip" });
    const result = await processImportZip(file, settings);

    expect(extractAndDetectZip).toHaveBeenCalledWith(file);
    expect(parseImportCsvContent).toHaveBeenCalledTimes(2);
    expect(validateImportFiles).toHaveBeenCalledTimes(1);
    expect(transformImportData).toHaveBeenCalledTimes(1);
    expect(result.processedData?.status).toBe("success");
  });

  it("should not transform when validation cannot proceed", async () => {
    vi.mocked(extractAndDetectZip).mockResolvedValue({
      files: [{ name: "ratings.csv", type: "ratings", content: "csv-ratings", size: 10, isValid: true }],
      allValid: true,
      summary: {
        profileFiles: 0,
        ratingFiles: 1,
        reviewFiles: 0,
        watchedFiles: 0,
        watchlistFiles: 0,
        listFiles: 0,
      },
    });

    vi.mocked(parseImportCsvContent).mockResolvedValue([{ date: "2024-01-01", name: "The Matrix", year: 1999 }]);

    vi.mocked(validateImportFiles).mockResolvedValue({
      isValid: false,
      canProceed: false,
      issues: [
        {
          severity: "error",
          section: "ratings",
          message: "Invalid rating",
        },
      ],
      errors: ["Invalid rating"],
      warnings: [],
    });

    const file = new File(["zip"], "letterboxd.zip", { type: "application/zip" });
    const result = await processImportZip(file, settings);

    expect(transformImportData).not.toHaveBeenCalled();
    expect(result.processedData).toBeNull();
    expect(result.validation.canProceed).toBe(false);
  });

  it("should aggregate multiple list files", async () => {
    vi.mocked(extractAndDetectZip).mockResolvedValue({
      files: [
        { name: "list-a.csv", type: "list", content: "csv-list-a", size: 10, isValid: true },
        { name: "list-b.csv", type: "list", content: "csv-list-b", size: 10, isValid: true },
      ],
      allValid: true,
      summary: {
        profileFiles: 0,
        ratingFiles: 0,
        reviewFiles: 0,
        watchedFiles: 0,
        watchlistFiles: 0,
        listFiles: 2,
      },
    });

    vi.mocked(parseImportCsvContent)
      .mockResolvedValueOnce({ date: "2024-01-01", name: "List A", movies: [] })
      .mockResolvedValueOnce({ date: "2024-01-01", name: "List B", movies: [] });

    vi.mocked(validateImportFiles).mockResolvedValue({
      isValid: true,
      canProceed: true,
      issues: [],
      errors: [],
      warnings: [],
    });

    vi.mocked(transformImportData).mockResolvedValue({
      fileName: "letterboxd.zip",
      status: "success",
      movies: [],
      lists: [],
      stats: {
        totalMovies: 0,
        matchedMovies: 0,
        unmatchedMovies: 0,
        totalLists: 0,
      },
    });

    const file = new File(["zip"], "letterboxd.zip", { type: "application/zip" });
    const result = await processImportZip(file, settings);

    expect(result.parsedData.lists).toHaveLength(2);
    expect(parseImportCsvContent).toHaveBeenCalledTimes(2);
  });

  it("should parse all supported file types and merge invalid detection warnings", async () => {
    vi.mocked(extractAndDetectZip).mockResolvedValue({
      files: [
        { name: "profile.csv", type: "profile", content: "csv-profile", size: 10, isValid: true },
        { name: "reviews.csv", type: "reviews", content: "csv-reviews", size: 10, isValid: true },
        { name: "watchlist.csv", type: "watchlist", content: "csv-watchlist", size: 10, isValid: true },
        { name: "broken-list.csv", type: "list", content: "csv-broken", size: 10, isValid: false, validationIssue: "Missing required column: Name" },
        { name: "unknown.bin", type: "unknown", content: "???", size: 3, isValid: false },
      ],
      allValid: false,
      summary: {
        profileFiles: 1,
        ratingFiles: 0,
        reviewFiles: 1,
        watchedFiles: 0,
        watchlistFiles: 1,
        listFiles: 1,
      },
    });

    vi.mocked(parseImportCsvContent)
      .mockResolvedValueOnce({ username: "john", dateJoined: "2024-01-01" })
      .mockResolvedValueOnce([{ date: "2024-01-01", name: "The Matrix", year: 1999 }])
      .mockResolvedValueOnce([{ date: "2024-01-01", name: "Inception", year: 2010 }]);

    vi.mocked(validateImportFiles).mockResolvedValue({
      isValid: true,
      canProceed: true,
      issues: [],
      errors: [],
      warnings: [],
    });

    vi.mocked(transformImportData).mockResolvedValue({
      fileName: "letterboxd.zip",
      status: "partial",
      movies: [],
      lists: [],
      stats: {
        totalMovies: 0,
        matchedMovies: 0,
        unmatchedMovies: 0,
        totalLists: 0,
      },
    });

    const file = new File(["zip"], "letterboxd.zip", { type: "application/zip" });
    const result = await processImportZip(file, settings);

    expect(parseImportCsvContent).toHaveBeenCalledTimes(3);
    expect(result.parsedData.profile?.username).toBe("john");
    expect(result.parsedData.reviews).toHaveLength(1);
    expect(result.parsedData.watchlist).toHaveLength(1);
    expect(result.validation.warnings.length).toBeGreaterThan(0);
    expect(result.validation.issues.some((i) => i.fileName === "broken-list.csv")).toBe(true);
    expect(result.validation.issues.some((i) => i.fileName === "unknown.bin")).toBe(false);
  });

  it("should keep profile undefined when profile parser returns null", async () => {
    vi.mocked(extractAndDetectZip).mockResolvedValue({
      files: [{ name: "profile.csv", type: "profile", content: "csv-profile", size: 10, isValid: true }],
      allValid: true,
      summary: {
        profileFiles: 1,
        ratingFiles: 0,
        reviewFiles: 0,
        watchedFiles: 0,
        watchlistFiles: 0,
        listFiles: 0,
      },
    });

    vi.mocked(parseImportCsvContent).mockResolvedValueOnce(null);
    vi.mocked(validateImportFiles).mockResolvedValue({
      isValid: true,
      canProceed: true,
      issues: [],
      errors: [],
      warnings: [],
    });

    vi.mocked(transformImportData).mockResolvedValue({
      fileName: "letterboxd.zip",
      status: "error",
      movies: [],
      lists: [],
      stats: {
        totalMovies: 0,
        matchedMovies: 0,
        unmatchedMovies: 0,
        totalLists: 0,
      },
    });

    const file = new File(["zip"], "letterboxd.zip", { type: "application/zip" });
    const result = await processImportZip(file, settings);

    expect(result.parsedData.profile).toBeUndefined();
    expect(validateImportFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        ratings: [],
        reviews: [],
        watched: [],
        watchlist: [],
        lists: [],
      })
    );
  });

  it("should warn when zip has no recognizable import files", async () => {
    vi.mocked(extractAndDetectZip).mockResolvedValue({
      files: [
        { name: "random.txt", type: "unknown", content: "x", size: 1, isValid: true },
        { name: "notes.bin", type: "unknown", content: "y", size: 1, isValid: true },
      ],
      allValid: true,
      summary: {
        profileFiles: 0,
        ratingFiles: 0,
        reviewFiles: 0,
        watchedFiles: 0,
        watchlistFiles: 0,
        listFiles: 0,
      },
    });

    vi.mocked(validateImportFiles).mockResolvedValue({
      isValid: true,
      canProceed: true,
      issues: [],
      errors: [],
      warnings: [],
    });

    vi.mocked(transformImportData).mockResolvedValue({
      fileName: "random.zip",
      status: "error",
      movies: [],
      lists: [],
      stats: {
        totalMovies: 0,
        matchedMovies: 0,
        unmatchedMovies: 0,
        totalLists: 0,
      },
    });

    const file = new File(["zip"], "random.zip", { type: "application/zip" });
    const result = await processImportZip(file, settings);

    expect(result.validation.warnings).toContain("Nenhum arquivo de importação reconhecido no ZIP. Envie o ZIP exportado diretamente do aplicativo.");
  });
});
