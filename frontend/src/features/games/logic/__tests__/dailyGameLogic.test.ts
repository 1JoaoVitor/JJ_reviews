import { describe, expect, it } from "vitest";
import {
  buildGuessSummary,
  compareMovieProfiles,
  getCoverRevealState,
  getYearDirectionHint,
  normalizeCountriesToPtBr,
  shouldUseTmdbSuggestions,
  type GameMovieProfile,
} from "../dailyGameLogic";

function makeProfile(overrides: Partial<GameMovieProfile> = {}): GameMovieProfile {
  return {
    tmdbId: 1,
    title: "Filme X",
    releaseYear: 2010,
    director: "Diretor A",
    genres: ["Drama"],
    countries: ["Estados Unidos"],
    cast: ["Ator 1", "Ator 2", "Ator 3", "Ator 4", "Ator 5"],
    runtime: 120,
    ...overrides,
  };
}

describe("dailyGameLogic", () => {
  it("normaliza paises para pt-BR", () => {
    const result = normalizeCountriesToPtBr(["United States", "Japan", "Brasil"]);
    expect(result).toEqual(["Estados Unidos", "Japao", "Brasil"]);
  });

  it("ano mostra direcao correta", () => {
    expect(getYearDirectionHint(2000, 2005)).toContain("mais atual");
    expect(getYearDirectionHint(2010, 2005)).toContain("mais antigo");
    expect(getYearDirectionHint(2005, 2005)).toBe("");
  });

  it("paises ficam corretos quando todos batem", () => {
    const guess = makeProfile({ countries: ["Estados Unidos", "Japao"] });
    const target = makeProfile({ countries: ["Estados Unidos", "Japao"] });

    const result = compareMovieProfiles(guess, target);
    const countryField = result.fields.find((f) => f.label === "Paises");
    expect(countryField?.status).toBe("correct");
  });

  it("paises ficam perto quando existe intersecao parcial", () => {
    const guess = makeProfile({ countries: ["Estados Unidos", "Canada"] });
    const target = makeProfile({ countries: ["Estados Unidos", "Japao"] });

    const result = compareMovieProfiles(guess, target);
    const countryField = result.fields.find((f) => f.label === "Paises");
    expect(countryField?.status).toBe("close");
  });

  it("atores ficam corretos apenas quando os 5 batem", () => {
    const targetCast = ["A", "B", "C", "D", "E"];
    const guessAll = makeProfile({ cast: targetCast });
    const target = makeProfile({ cast: targetCast });

    const resultAll = compareMovieProfiles(guessAll, target);
    const fieldAll = resultAll.fields.find((f) => f.label === "Ator/Atriz principal");
    expect(fieldAll?.status).toBe("correct");

    const guessPartial = makeProfile({ cast: ["A", "X", "Y", "Z", "W"] });
    const resultPartial = compareMovieProfiles(guessPartial, target);
    const fieldPartial = resultPartial.fields.find((f) => f.label === "Ator/Atriz principal");
    expect(fieldPartial?.status).toBe("close");
  });

  it("ano fica perto no intervalo de ±5", () => {
    const guess = makeProfile({ releaseYear: 2005 });
    const target = makeProfile({ releaseYear: 2010 });
    const result = compareMovieProfiles(guess, target);
    const yearField = result.fields.find((f) => f.label === "Ano");
    expect(yearField?.status).toBe("close");
  });

  it("resumo consolida melhor status por campo", () => {
    const target = makeProfile({ tmdbId: 99, title: "Alvo", releaseYear: 2015 });
    const guess1 = compareMovieProfiles(makeProfile({ tmdbId: 1, releaseYear: 1990, director: "Outro" }), target);
    const guess2 = compareMovieProfiles(makeProfile({ tmdbId: 2, releaseYear: 2014, director: "Diretor A" }), target);

    const summary = buildGuessSummary([guess1, guess2], 3);
    expect(summary.attempts).toBe(2);
    expect(summary.livesLeft).toBe(3);
    const year = summary.fields.find((f) => f.label === "Ano");
    expect(year?.status).toBe("close");
  });

  it("busca TMDB so no modo global", () => {
    expect(shouldUseTmdbSuggestions("global_daily")).toBe(true);
    expect(shouldUseTmdbSuggestions("my_watched")).toBe(false);
    expect(shouldUseTmdbSuggestions("list_scope")).toBe(false);
  });

  it("capa fica mais pixelada e borrada no inicio", () => {
    const early = getCoverRevealState(6, false, 6);
    const mid = getCoverRevealState(3, false, 6);
    const lowLives = getCoverRevealState(1, false, 6);
    const win = getCoverRevealState(6, true, 6);

    expect(early.blurPx).toBeGreaterThan(mid.blurPx);
    expect(mid.blurPx).toBeGreaterThan(lowLives.blurPx);
    expect(early.posterSize).toBe("w92");
    expect(early.gridSize).toBe(8);
    expect(early.totalTiles).toBe(64);
    expect(lowLives.revealTiles).toBeGreaterThan(mid.revealTiles);
    expect(win.posterSize).toBe("w500");
    expect(win.blurPx).toBe(0);
    expect(win.revealTiles).toBe(win.totalTiles);
  });
});
