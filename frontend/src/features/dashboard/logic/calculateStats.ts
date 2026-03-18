import type { MovieData } from "@/types";

export interface DashboardStats {
   totalMovies: number;
   averageRating: number;
   totalRuntimeMinutes: number;
   internationalCount: number;
   internationalPercent: number;
   topDirector: { name: string; count: number } | null;
}

export function calculateDashboardStats(movies: MovieData[]): DashboardStats {
   // Filtrar apenas os assistidos (a base de todos os cálculos)
   const watched = movies.filter((m) => m.status === "watched" || !m.status);
   const totalMovies = watched.length;

   if (totalMovies === 0) {
      return {
         totalMovies: 0,
         averageRating: 0,
         totalRuntimeMinutes: 0,
         internationalCount: 0,
         internationalPercent: 0,
         topDirector: null,
      };
   }

   // Média Geral (só de filmes com nota)
   const ratedMovies = watched.filter((m) => m.rating != null);
   const averageRating = ratedMovies.length > 0
      ? ratedMovies.reduce((sum, m) => sum + (m.rating || 0), 0) / ratedMovies.length
      : 0;

   // Tempo de Vida
   const totalRuntimeMinutes = watched.reduce((sum, m) => {
      const validRuntime = m.runtime && m.runtime > 0 ? m.runtime : 0;
      return sum + validRuntime;
   }, 0);

   // Filmes Internacionais (NÃO têm 'Estados Unidos' na lista de países)
   const internationalMovies = watched.filter(
      (m) => m.countries && m.countries.length > 0 && !m.countries.includes("Estados Unidos")
   );
   const internationalCount = internationalMovies.length;
   const internationalPercent = Math.round((internationalCount / totalMovies) * 100);

   // Diretor Favorito
   const directorMap = new Map<string, number>();
   watched.forEach((m) => {
      if (m.director && m.director !== "Desconhecido" && m.director !== "Diretor Desconhecido") {
         directorMap.set(m.director, (directorMap.get(m.director) || 0) + 1);
      }
   });

   let topDirector: { name: string; count: number } | null = null;

   for (const [name, count] of directorMap.entries()) {
      if (!topDirector || count > topDirector.count) {
         topDirector = { name, count };
      }
   }

   if (topDirector && topDirector.count < 2) {
      topDirector = null;
   }

   return {
      totalMovies,
      averageRating: Math.round(averageRating * 10) / 10, 
      totalRuntimeMinutes,
      internationalCount,
      internationalPercent,
      topDirector,
   };
}