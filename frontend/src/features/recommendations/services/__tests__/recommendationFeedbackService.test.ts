import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fromMock,
  selectMock,
  eqMock,
  maybeSingleMock,
  upsertMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: fromMock,
  },
}));

import {
  fetchRecommendationFeedback,
  upsertRecommendationFeedback,
} from "../recommendationFeedbackService";

describe("recommendationFeedbackService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });

    fromMock.mockReturnValue({
      select: selectMock,
      upsert: upsertMock,
    });
  });

  it("returns empty feedback when row is not found", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const result = await fetchRecommendationFeedback("u1");

    expect(result).toEqual({ genreAdjustments: {}, dislikedMovieIds: [] });
  });

  it("normalizes valid row payload and ignores invalid values", async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        user_id: "u1",
        genre_adjustments: {
          "28": 2,
          "35": "-1",
          x: "abc",
        },
        disliked_movie_ids: [10, "x", 30],
      },
      error: null,
    });

    const result = await fetchRecommendationFeedback("u1");

    expect(result.genreAdjustments).toEqual({ 28: 2, 35: -1 });
    expect(result.dislikedMovieIds).toEqual([10, 30]);
  });

  it("returns empty feedback when query fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    maybeSingleMock.mockResolvedValue({ data: null, error: new Error("db-down") });

    const result = await fetchRecommendationFeedback("u1");

    expect(result).toEqual({ genreAdjustments: {}, dislikedMovieIds: [] });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("upserts profile payload with expected columns", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await expect(
      upsertRecommendationFeedback("u2", {
        genreAdjustments: { 28: 3, 18: -2 },
        dislikedMovieIds: [111, 222],
      }),
    ).resolves.toBeUndefined();

    expect(upsertMock).toHaveBeenCalledWith(
      {
        user_id: "u2",
        genre_adjustments: { 28: 3, 18: -2 },
        disliked_movie_ids: [111, 222],
      },
      { onConflict: "user_id" },
    );
  });

  it("throws when upsert fails", async () => {
    upsertMock.mockResolvedValue({ error: new Error("upsert-failed") });

    await expect(
      upsertRecommendationFeedback("u2", {
        genreAdjustments: {},
        dislikedMovieIds: [],
      }),
    ).rejects.toThrow("upsert-failed");
  });
});
