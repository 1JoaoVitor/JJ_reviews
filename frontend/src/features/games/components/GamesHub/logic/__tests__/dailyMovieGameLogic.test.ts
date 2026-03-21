import { describe, expect, it, vi } from "vitest";
import type { MovieData } from "@/types";
import {
  GLOBAL_DAILY_TMDB_IDS,
  MAX_LIVES,
  buildDailySeed,
  getListLabel,
  getTodayKey,
  normalizeText,
  pickDeterministicMovie,
  toMovieProfileFromApp,
  toMovieProfileFromTmdb,
} from "../dailyMovieGameLogic";

function makeMovie(overrides: Partial<MovieData> = {}): MovieData {
  return {
    id: 1,
    tmdb_id: 550,
    rating: 4,
    review: "x",
    recommended: "yes",
    created_at: "2026-01-01",
    title: "Cidade de Deus",
    release_date: "2002-08-31",
    director: "Fernando Meirelles",
    countries: ["United States", "Brazil"],
    cast: ["A", "B", "C", "D", "E", "F"],
    genres: ["Crime", "Drama"],
    runtime: 130,
    poster_path: "/poster.jpg",
    ...overrides,
  };
}

describe("dailyMovieGameLogic", () => {
  it("expoe constantes esperadas", () => {
    expect(MAX_LIVES).toBe(6);
    expect(GLOBAL_DAILY_TMDB_IDS.length).toBeGreaterThan(0);
  });

  it("gera seed deterministica e sensivel a entrada", () => {
    const a = buildDailySeed("2026-03-21", "global", "cover");
    const b = buildDailySeed("2026-03-21", "global", "cover");
    const c = buildDailySeed("2026-03-21", "global", "riddle");

    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("getTodayKey retorna formato YYYY-MM-DD", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-21T13:05:00Z"));

    expect(getTodayKey()).toBe("2026-03-21");

    vi.useRealTimers();
  });

  it("normalizeText remove acentos e espacos extras", () => {
    expect(normalizeText("  Coração Valente  ")).toBe("coracao valente");
    expect(normalizeText(undefined)).toBe("");
  });

  it("toMovieProfileFromApp converte e aplica defaults", () => {
    const profile = toMovieProfileFromApp(
      makeMovie({ title: undefined, countries: ["United States"], cast: ["A", "B", "C", "D", "E", "F"] })
    );

    expect(profile.tmdbId).toBe(550);
    expect(profile.title).toBe("Sem titulo");
    expect(profile.releaseYear).toBe(2002);
    expect(profile.countries).toEqual(["Estados Unidos"]);
    expect(profile.cast).toEqual(["A", "B", "C", "D", "E"]);
    expect(profile.posterPath).toBe("/poster.jpg");
  });

  it("toMovieProfileFromTmdb converte crew, cast e campos opcionais", () => {
    const profile = toMovieProfileFromTmdb({
      id: 99,
      title: "Filme Teste",
      release_date: "1999-12-31",
      runtime: 123,
      poster_path: "/abc.jpg",
      genres: [{ name: "Drama" }, { name: "Sci-Fi" }],
      production_countries: [{ name: "Japan" }],
      credits: {
        crew: [{ job: "Writer", name: "W" }, { job: "Director", name: "D" }],
        cast: [{ name: "A1" }, { name: "A2" }, { name: "A3" }, { name: "A4" }, { name: "A5" }, { name: "A6" }],
      },
    });

    expect(profile.tmdbId).toBe(99);
    expect(profile.director).toBe("D");
    expect(profile.genres).toEqual(["Drama", "Sci-Fi"]);
    expect(profile.countries).toEqual(["Japao"]);
    expect(profile.cast).toEqual(["A1", "A2", "A3", "A4", "A5"]);
  });

  it("pickDeterministicMovie retorna null para pool vazio e item por seed", () => {
    expect(pickDeterministicMovie<number>([], 1)).toBeNull();
    expect(pickDeterministicMovie([10, 20, 30], 4)).toBe(20);
  });

  it("getListLabel monta texto ou fallback", () => {
    expect(getListLabel(["A", "B"])).toBe("A, B");
    expect(getListLabel([])).toBe("Nao informado");
  });
});
