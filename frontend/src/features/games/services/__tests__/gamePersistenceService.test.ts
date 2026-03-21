import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fromMock,
  insertMock,
  selectMock,
  singleMock,
  updateMock,
  eqMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  insertMock: vi.fn(),
  selectMock: vi.fn(),
  singleMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: fromMock,
  },
}));

import {
  finishGameSession,
  persistBattleMatch,
  persistDailyAttempt,
  startGameSession,
  updateGameSessionProgress,
} from "../gamePersistenceService";

describe("gamePersistenceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    selectMock.mockReturnValue({ single: singleMock });
    updateMock.mockReturnValue({ eq: eqMock });

    fromMock.mockImplementation((table: string) => {
      if (table === "game_sessions") {
        return {
          insert: insertMock,
          update: updateMock,
        };
      }

      if (table === "game_daily_attempts" || table === "game_battle_matches") {
        return {
          insert: insertMock,
        };
      }

      return {
        insert: insertMock,
        update: updateMock,
      };
    });
  });

  it("starts a game session and returns its id", async () => {
    insertMock.mockReturnValue({ select: selectMock });
    singleMock.mockResolvedValue({ data: { id: "session-1" }, error: null });

    const sessionId = await startGameSession({
      userId: "u1",
      gameType: "daily_cover",
      sourceMode: "global_daily",
      dateKey: "2026-03-21",
      targetTmdbId: 10,
      maxLives: 6,
      livesLeft: 6,
      metadata: { test: true },
    });

    expect(sessionId).toBe("session-1");
    expect(fromMock).toHaveBeenCalledWith("game_sessions");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        game_type: "daily_cover",
        source_mode: "global_daily",
        status: "in_progress",
      })
    );
  });

  it("returns null when starting session fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    insertMock.mockReturnValue({ select: selectMock });
    singleMock.mockResolvedValue({ data: null, error: new Error("insert-failed") });

    const sessionId = await startGameSession({
      userId: "u1",
      gameType: "daily_riddle",
      sourceMode: "my_watched",
      dateKey: "2026-03-21",
    });

    expect(sessionId).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("updates game session progress", async () => {
    eqMock.mockResolvedValue({ error: null });

    await updateGameSessionProgress("session-1", 4, 3);

    expect(fromMock).toHaveBeenCalledWith("game_sessions");
    expect(updateMock).toHaveBeenCalledWith({ lives_left: 4, attempts_count: 3 });
    expect(eqMock).toHaveBeenCalledWith("id", "session-1");
  });

  it("logs error when updating progress fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    eqMock.mockResolvedValue({ error: new Error("update-failed") });

    await updateGameSessionProgress("session-1", 2, 5);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("finishes game session", async () => {
    eqMock.mockResolvedValue({ error: null });

    await finishGameSession({
      sessionId: "session-2",
      status: "won",
      livesLeft: 3,
      attemptsCount: 6,
      metadata: { championTmdbId: 50 },
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "won",
        lives_left: 3,
        attempts_count: 6,
        metadata: { championTmdbId: 50 },
        ended_at: expect.any(String),
      })
    );
    expect(eqMock).toHaveBeenCalledWith("id", "session-2");
  });

  it("persists daily attempt", async () => {
    insertMock.mockResolvedValue({ error: null });

    await persistDailyAttempt({
      sessionId: "s1",
      userId: "u1",
      attemptIndex: 1,
      guessedTmdbId: 120,
      guessTitle: "Filme X",
      isCorrect: false,
      livesAfter: 5,
      fields: [{ label: "Ano", status: "close" }],
    });

    expect(fromMock).toHaveBeenCalledWith("game_daily_attempts");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: "s1",
        user_id: "u1",
        attempt_index: 1,
        guessed_tmdb_id: 120,
        guess_title: "Filme X",
      })
    );
  });

  it("persists battle match", async () => {
    insertMock.mockResolvedValue({ error: null });

    await persistBattleMatch({
      sessionId: "s1",
      userId: "u1",
      roundSize: 16,
      matchIndex: 2,
      movieATmdbId: 101,
      movieBTmdbId: 102,
      winnerTmdbId: 101,
    });

    expect(fromMock).toHaveBeenCalledWith("game_battle_matches");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: "s1",
        user_id: "u1",
        round_size: 16,
        match_index: 2,
        winner_tmdb_id: 101,
      })
    );
  });

  it("logs error when persisting daily attempt fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    insertMock.mockResolvedValue({ error: new Error("daily-attempt-failed") });

    await persistDailyAttempt({
      sessionId: "s1",
      userId: "u1",
      attemptIndex: 1,
      guessTitle: "Filme X",
      isCorrect: false,
      livesAfter: 5,
      fields: [],
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("logs error when persisting battle match fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    insertMock.mockResolvedValue({ error: new Error("battle-match-failed") });

    await persistBattleMatch({
      sessionId: "s1",
      userId: "u1",
      roundSize: 8,
      matchIndex: 1,
      movieATmdbId: 11,
      movieBTmdbId: 12,
      winnerTmdbId: 11,
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
