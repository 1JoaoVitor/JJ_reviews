import type { MovieData } from "@/types";

export type SortOrder = "default" | "rating" | "date" | "alpha";

export function sortMovies(movies: MovieData[], order: SortOrder): MovieData[] {
   return [...movies].sort((a, b) => {
      switch (order) {
         case "rating": 
            return (b.rating ?? 0) - (a.rating ?? 0);
         case "date": 
            return new Date(b.release_date || "1900").getTime() - new Date(a.release_date || "1900").getTime();
         case "alpha": 
            return (a.title || "").localeCompare(b.title || "");
         default: 
            return b.id - a.id; 
      }
   });
}