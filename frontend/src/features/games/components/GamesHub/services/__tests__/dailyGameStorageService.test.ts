import { afterEach, describe, expect, it, vi } from "vitest";
import type { DailyGameProgress } from "../dailyGameStorageService";
import {
  clearDailyGameProgress,
  loadDailyGameProgress,
  saveDailyGameProgress,
} from "../dailyGameStorageService";

const KEY = "daily-progress-test";

function makeProgress(): DailyGameProgress {
  return {
    dateKey: "2026-03-21",
    targetMovie: {
      tmdbId: 1,
      title: "Filme",
      genres: ["Drama"],
      countries: ["Brasil"],
      cast: ["A"],
    },
    lives: 5,
    guesses: [],
    sessionId: "s1",
    revealedHintFields: ["Diretor"],
  };
}

describe("dailyGameStorageService", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("salva e carrega progresso", () => {
    const progress = makeProgress();

    saveDailyGameProgress(KEY, progress);
    const loaded = loadDailyGameProgress(KEY);

    expect(loaded).toEqual(progress);
  });

  it("retorna null quando chave nao existe", () => {
    expect(loadDailyGameProgress("nao-existe")).toBeNull();
  });

  it("remove item invalido quando JSON estiver corrompido", () => {
    window.sessionStorage.setItem(KEY, "{ invalido");

    const loaded = loadDailyGameProgress(KEY);

    expect(loaded).toBeNull();
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it("ignora erro ao salvar no sessionStorage", () => {
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    expect(() => saveDailyGameProgress(KEY, makeProgress())).not.toThrow();
    expect(setSpy).toHaveBeenCalled();
  });

  it("limpa progresso", () => {
    window.sessionStorage.setItem(KEY, JSON.stringify(makeProgress()));

    clearDailyGameProgress(KEY);

    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });
});
