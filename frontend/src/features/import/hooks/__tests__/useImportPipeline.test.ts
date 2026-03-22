import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RatingScale } from "../../types/importTypes";
import { useImportPipeline } from "../useImportPipeline";

vi.mock("../../services/importPipelineService", () => ({
  processImportZip: vi.fn(),
}));

const { processImportZip } = await import("../../services/importPipelineService");

describe("useImportPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should expose default initial state", () => {
    const { result } = renderHook(() => useImportPipeline());

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.settings.ratingScale).toBe(RatingScale.SCALE_1_TO_1);
  });

  it("should process zip and store successful result", async () => {
    vi.mocked(processImportZip).mockResolvedValue({
      detected: {
        files: [],
        allValid: true,
        summary: {
          profileFiles: 0,
          ratingFiles: 0,
          reviewFiles: 0,
          diaryFiles: 0,
          watchedFiles: 0,
          watchlistFiles: 0,
          listFiles: 0,
        },
      },
      parsedData: { ratings: [], reviews: [], diary: [], watched: [], watchlist: [], lists: [] },
      validation: { isValid: true, canProceed: true, issues: [], warnings: [], errors: [] },
      processedData: {
        fileName: "sample.zip",
        status: "success",
        movies: [],
        diaryEntries: [],
        lists: [],
        stats: { totalMovies: 0, totalDiaryEntries: 0, matchedMovies: 0, unmatchedMovies: 0, unmatchedDiaryEntries: 0, totalLists: 0 },
      },
    });

    const file = new File(["zip"], "sample.zip", { type: "application/zip" });
    const { result } = renderHook(() => useImportPipeline());

    await act(async () => {
      await result.current.runImport(file);
    });

    expect(processImportZip).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.result?.processedData?.status).toBe("success");
  });

  it("should merge initial and override settings", async () => {
    vi.mocked(processImportZip).mockResolvedValue({
      detected: {
        files: [],
        allValid: true,
        summary: {
          profileFiles: 0,
          ratingFiles: 0,
          reviewFiles: 0,
          diaryFiles: 0,
          watchedFiles: 0,
          watchlistFiles: 0,
          listFiles: 0,
        },
      },
      parsedData: { ratings: [], reviews: [], diary: [], watched: [], watchlist: [], lists: [] },
      validation: { isValid: true, canProceed: true, issues: [], warnings: [], errors: [] },
      processedData: null,
    });

    const file = new File(["zip"], "sample.zip", { type: "application/zip" });
    const { result } = renderHook(() =>
      useImportPipeline({
        ratingScale: RatingScale.SCALE_0_TO_10,
        listTypeMap: { Favorites: "full_shared" },
      })
    );

    await act(async () => {
      await result.current.runImport(file, {
        skipUnmatchedMovies: true,
        listTypeMap: { WatchLater: "private" },
      });
    });

    expect(processImportZip).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        ratingScale: RatingScale.SCALE_0_TO_10,
        skipUnmatchedMovies: true,
        listTypeMap: {
          Favorites: "full_shared",
          WatchLater: "private",
        },
      })
    );
  });

  it("should expose error when processing fails", async () => {
    vi.mocked(processImportZip).mockRejectedValue(new Error("zip broken"));

    const file = new File(["zip"], "broken.zip", { type: "application/zip" });
    const { result } = renderHook(() => useImportPipeline());

    await act(async () => {
      await expect(result.current.runImport(file)).rejects.toThrow("zip broken");
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBe("zip broken");
    });
  });

  it("should reset local state", async () => {
    vi.mocked(processImportZip).mockResolvedValue({
      detected: {
        files: [],
        allValid: true,
        summary: {
          profileFiles: 0,
          ratingFiles: 0,
          reviewFiles: 0,
          diaryFiles: 0,
          watchedFiles: 0,
          watchlistFiles: 0,
          listFiles: 0,
        },
      },
      parsedData: { ratings: [], reviews: [], diary: [], watched: [], watchlist: [], lists: [] },
      validation: { isValid: true, canProceed: true, issues: [], warnings: [], errors: [] },
      processedData: null,
    });

    const file = new File(["zip"], "sample.zip", { type: "application/zip" });
    const { result } = renderHook(() => useImportPipeline());

    await act(async () => {
      await result.current.runImport(file);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isProcessing).toBe(false);
  });
});
