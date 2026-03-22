import { describe, expect, it, vi } from "vitest";
import type { MovieData } from "@/types";
import {
  GLOBAL_DAILY_TMDB_IDS,
  MAX_LIVES,
  buildDailySeed,
  formatTodayKeyDDMMYYYY,
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

  it("formatTodayKeyDDMMYYYY converte para DD/MM/YYYY e preserva valor invalido", () => {
    expect(formatTodayKeyDDMMYYYY("2026-03-22")).toBe("22/03/2026");
    expect(formatTodayKeyDDMMYYYY("data-invalida")).toBe("data-invalida");
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

  it("toMovieProfileFromApp aplica fallbacks quando campos opcionais estao ausentes", () => {
    const profile = toMovieProfileFromApp(
      makeMovie({
        release_date: "xx",
        countries: [],
        cast: [],
        poster_path: undefined,
      })
    );

    expect(profile.releaseYear).toBeUndefined();
    expect(profile.countries).toEqual([]);
    expect(profile.cast).toEqual([]);
    expect(profile.posterPath).toBeUndefined();
  });

  it("toMovieProfileFromTmdb lida com credits e campos vazios", () => {
    const profile = toMovieProfileFromTmdb({
      id: 7,
      title: undefined,
      release_date: "",
      runtime: 0,
      poster_path: "",
      genres: [{ name: "" }],
      production_countries: [{ name: "" }],
      credits: {
        crew: [{ job: "Writer", name: "W" }],
        cast: [{ name: "" }],
      },
    });

    expect(profile.tmdbId).toBe(7);
    expect(profile.title).toBe("Sem titulo");
    expect(profile.releaseYear).toBeUndefined();
    expect(profile.director).toBeUndefined();
    expect(profile.genres).toEqual([]);
    expect(profile.countries).toEqual([]);
    expect(profile.cast).toEqual([]);
    expect(profile.runtime).toBeUndefined();
    expect(profile.posterPath).toBeUndefined();
  });

  it("pickDeterministicMovie retorna null para pool vazio e item por seed", () => {
    expect(pickDeterministicMovie<number>([], 1)).toBeNull();
    expect(pickDeterministicMovie([10, 20, 30], 4)).toBe(20);
  });

  it("parseYear with short date returns undefined", () => {
    const profile1 = toMovieProfileFromApp(makeMovie({ release_date: "20" }));
    const profile2 = toMovieProfileFromApp(makeMovie({ release_date: "" }));
    const profile3 = toMovieProfileFromApp(makeMovie({ release_date: undefined }));

    expect(profile1.releaseYear).toBeUndefined();
    expect(profile2.releaseYear).toBeUndefined();
    expect(profile3.releaseYear).toBeUndefined();
  });

  it("toMovieProfileFromApp with minimal cast array", () => {
    const profile = toMovieProfileFromApp(makeMovie({ cast: ["A"] }));
    expect(profile.cast).toEqual(["A"]);
  });

  it("toMovieProfileFromTmdb with empty credits array", () => {
    const profile = toMovieProfileFromTmdb({
      id: 42,
      title: "Test",
      credits: {
        crew: [],
        cast: [],
      },
    });

    expect(profile.director).toBeUndefined();
    expect(profile.cast).toEqual([]);
  });

  it("toMovieProfileFromTmdb with missing credentials object", () => {
    const profile = toMovieProfileFromTmdb({
      id: 42,
      title: "Test",
      credits: undefined,
    });

    expect(profile.director).toBeUndefined();
    expect(profile.cast).toEqual([]);
  });

  it("toMovieProfileFromTmdb with undefined credits", () => {
    const profile = toMovieProfileFromTmdb({
      id: 42,
      title: "Test",
      credits: undefined,
    });

    expect(profile.director).toBeUndefined();
    expect(profile.cast).toEqual([]);
  });

  it("getListLabel with empty array returns Nao informado", () => {
    expect(getListLabel([])).toBe("Nao informado");
    expect(getListLabel(["A", "B"])).toBe("A, B");
  });

  it("parseYear handles string length exactly 4", () => {
    const profile = toMovieProfileFromApp(makeMovie({ release_date: "2020" }));
    expect(profile.releaseYear).toBe(2020);
  });

  it("toMovieProfileFromApp with single cast member", () => {
    const profile = toMovieProfileFromApp(makeMovie({ cast: ["Solo"] }));
    expect(profile.cast).toEqual(["Solo"]);
    expect(profile.cast.length).toBe(1);
  });

  it("toMovieProfileFromApp with 6 cast members returns only 5", () => {
    const profile = toMovieProfileFromApp(makeMovie({ cast: ["A", "B", "C", "D", "E", "F"] }));
    expect(profile.cast.length).toBe(5);
    expect(profile.cast).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("toMovieProfileFromTmdb with crew array has Array.isArray true condition", () => {
    const profile = toMovieProfileFromTmdb({
      id: 1,
      credits: {
        crew: [{ job: "Director", name: "Christopher Nolan" }],
        cast: [],
      },
    });

    expect(profile.director).toBe("Christopher Nolan");
  });

  it("toMovieProfileFromTmdb crew with no director still filters", () => {
    const profile = toMovieProfileFromTmdb({
      id: 1,
      credits: {
        crew: [{ job: "Producer", name: "Producer Name" }, { job: "Writer", name: "Writer Name" }],
        cast: [],
      },
    });

    expect(profile.director).toBeUndefined();
  });

  it("toMovieProfileFromTmdb cast map and filter chain", () => {
    const profile = toMovieProfileFromTmdb({
      id: 1,
      credits: {
        crew: [],
        cast: [{ name: "A" }, { name: "" }, { name: "B" }, { name: "C" }, { name: "D" }, { name: "E" }],
      },
    });

    expect(profile.cast.filter((x) => x).length).toBeGreaterThan(0);
    expect(profile.cast.length).toBeLessThanOrEqual(5);
  });

  it("getListLabel monta texto ou fallback", () => {
    expect(getListLabel(["A", "B"])).toBe("A, B");
    expect(getListLabel([])).toBe("Nao informado");
  });
});
