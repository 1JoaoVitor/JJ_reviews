import type { MovieData } from "@/types";

export type SelectionCriteria = "random" | "top_rated" | "worst_rated" | "recent" | "oscar" | "national";

export function shuffleArray<T>(array: T[]): T[] {
   const shuffled = [...array];
   for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
   }
   return shuffled;
}

export function nextPowerOfTwo(n: number): number {
   if (n <= 0) return 0;
   return Math.pow(2, Math.ceil(Math.log2(n)));
}

export function filterMoviesByCriteria(allMovies: MovieData[], criteria: SelectionCriteria): MovieData[] {
   const watchedMovies = allMovies.filter((m) => m.status === "watched" && m.rating !== null);

   switch (criteria) {
      case "oscar":
         return watchedMovies.filter((m) => m.isOscar);
      case "national":
         return watchedMovies.filter((m) => m.isNational);
      default:
         return watchedMovies;
   }
}

interface TournamentSetup {
   fighters: MovieData[];
   byes: MovieData[];
   bracketSize: number;
}

export function setupTournament(
   availableMovies: MovieData[], 
   criteria: SelectionCriteria, 
   quantity: number
): TournamentSetup {
   
   if (availableMovies.length < 2) {
      throw new Error("Mínimo de 2 filmes necessários para uma batalha.");
   }

   let targetCount = quantity;
   if (quantity === -1) {
      targetCount = availableMovies.length;
   } else {
      targetCount = Math.min(quantity, availableMovies.length);
   }

   let selected = [...availableMovies];
   switch (criteria) {
      case "top_rated":
         selected.sort((a, b) => (b.rating || 0) - (a.rating || 0));
         break;
      case "worst_rated":
         selected.sort((a, b) => (a.rating || 0) - (b.rating || 0));
         break;
      case "recent":
         selected.sort((a, b) => b.id - a.id);
         break;
      default:
         selected = shuffleArray(selected);
         break;
   }

   let participants = selected.slice(0, targetCount);

   const bracketSize = nextPowerOfTwo(participants.length);
   const byesCount = bracketSize - participants.length;
   const fightersCount = participants.length - byesCount;

   if (criteria !== "random") {
      participants = shuffleArray(participants);
   }

   return {
      fighters: participants.slice(0, fightersCount),
      byes: participants.slice(fightersCount),
      bracketSize,
   };
}