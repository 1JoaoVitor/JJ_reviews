import type { MovieData } from "@/types";

export function buildShareUrl(movie: MovieData, currentPath: string, username?: string | null): string {
   const baseUrl = "https://jj-reviews.vercel.app";
   let path = currentPath;

   // Se estiver na Home ("/" ou "") e estiver logado, força para o perfil
   if ((path === "/" || path === "") && username) {
      path = `/perfil/${username}`;
   }

   const targetId = movie.tmdb_id || movie.id; 
   return `${baseUrl}${path}?movie=${targetId}`;
}

export function buildShareContent(movieTitle: string | undefined) {
   const safeTitle = movieTitle || "Filme";
   return {
      title: `Review de ${safeTitle}`,
      text: `Confira a minha avaliação de ${safeTitle} no JJ Reviews!`,
   };
}

export function buildImageFileName(movieId: string | number, timestampMs: number): string {
   return `review-${movieId}-${timestampMs}.png`;
}