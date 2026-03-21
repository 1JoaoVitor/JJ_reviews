import type { MovieData } from "@/types";
import { normalizeCountriesToPtBr, type GameMovieProfile } from "@/features/games/logic/dailyGameLogic";

export type DailyMode = "cover" | "riddle";

interface TmdbCrewPerson {
   job?: string;
   name?: string;
}

interface TmdbCastPerson {
   name?: string;
}

interface TmdbNamedItem {
   name?: string;
}

export interface TmdbMovieDetails {
   id: number;
   title?: string;
   release_date?: string;
   runtime?: number;
   poster_path?: string;
   genres?: TmdbNamedItem[];
   production_countries?: TmdbNamedItem[];
   credits?: {
      crew?: TmdbCrewPerson[];
      cast?: TmdbCastPerson[];
   };
}

export interface TmdbSearchMovieResult {
   id: number;
   title?: string;
}

export const MAX_LIVES = 6;

export const GLOBAL_DAILY_TMDB_IDS = [
   157336, 27205, 238, 680, 496243, 550, 155, 13, 769, 11,
   603, 120, 129, 634649, 497, 372058, 637, 19404, 424, 122,
];

export function buildDailySeed(dateKey: string, scopeKey: string, mode: DailyMode | "battle_daily_16"): number {
   const source = `${dateKey}|${scopeKey}|${mode}`;
   let hash = 0;

   for (let i = 0; i < source.length; i += 1) {
      hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
   }

   return hash;
}

export function getTodayKey(): string {
   return new Date().toISOString().slice(0, 10);
}

export function normalizeText(value?: string | null): string {
   if (!value) return "";
   return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
}

function parseYear(date?: string): number | undefined {
   if (!date || date.length < 4) return undefined;
   const year = Number(date.slice(0, 4));
   return Number.isFinite(year) ? year : undefined;
}

export function toMovieProfileFromApp(movie: MovieData): GameMovieProfile {
   return {
      tmdbId: movie.tmdb_id,
      title: movie.title || "Sem titulo",
      releaseYear: parseYear(movie.release_date),
      director: movie.director,
      genres: movie.genres || [],
      countries: normalizeCountriesToPtBr(movie.countries || []),
      cast: (movie.cast || []).slice(0, 5),
      runtime: movie.runtime,
      posterPath: movie.poster_path || undefined,
   };
}

export function toMovieProfileFromTmdb(details: TmdbMovieDetails): GameMovieProfile {
   const crew = Array.isArray(details.credits?.crew) ? details.credits?.crew || [] : [];
   const cast = Array.isArray(details.credits?.cast) ? details.credits?.cast || [] : [];
   const director = crew.find((person) => person?.job === "Director")?.name;

   return {
      tmdbId: Number(details.id),
      title: details.title || "Sem titulo",
      releaseYear: parseYear(details.release_date),
      director,
      genres: (details.genres || []).map((genre) => genre.name).filter(Boolean) as string[],
      countries: normalizeCountriesToPtBr((details.production_countries || []).map((country) => country.name).filter(Boolean) as string[]),
      cast: cast.map((actor) => actor.name).filter(Boolean).slice(0, 5) as string[],
      runtime: details.runtime || undefined,
      posterPath: details.poster_path || undefined,
   };
}

export function pickDeterministicMovie<T>(pool: T[], seed: number): T | null {
   if (pool.length === 0) return null;
   const idx = seed % pool.length;
   return pool[idx] || null;
}

export function getListLabel(value: string[]): string {
   return value.length > 0 ? value.join(", ") : "Nao informado";
}
