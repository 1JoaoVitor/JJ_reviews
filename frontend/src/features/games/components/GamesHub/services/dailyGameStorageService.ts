import type { GuessResult, GameMovieProfile } from "@/features/games/logic/dailyGameLogic";

export interface DailyGameProgress {
   dateKey: string;
   targetMovie: GameMovieProfile;
   lives: number;
   guesses: GuessResult[];
   sessionId?: string | null;
   revealedHintFields?: string[];
}

export function loadDailyGameProgress(progressStorageKey: string): DailyGameProgress | null {
   try {
      const persistedRaw = window.sessionStorage.getItem(progressStorageKey);
      if (!persistedRaw) return null;
      return JSON.parse(persistedRaw) as DailyGameProgress;
   } catch {
      window.sessionStorage.removeItem(progressStorageKey);
      return null;
   }
}

export function saveDailyGameProgress(progressStorageKey: string, progress: DailyGameProgress): void {
   try {
      window.sessionStorage.setItem(progressStorageKey, JSON.stringify(progress));
   } catch {
      // Ignore storage quota/serialization issues to keep gameplay working.
   }
}

export function clearDailyGameProgress(progressStorageKey: string): void {
   window.sessionStorage.removeItem(progressStorageKey);
}
