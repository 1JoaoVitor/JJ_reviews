import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import type { MovieData } from "@/types";

/**
 * Hook que encapsula toda a lógica de compartilhamento
 * (gerar imagem do ShareCard e compartilhar via Web Share API ou download).
 */
export function useShare() {
   const shareRef = useRef<HTMLDivElement>(null);
   const [sharingMovie, setSharingMovie] = useState<MovieData | null>(null);
   const [isSharing, setIsSharing] = useState(false);

   const handleShare = useCallback(async (movie: MovieData) => {
      setSharingMovie(movie);
      setIsSharing(true);

      setTimeout(async () => {
         if (shareRef.current) {
            try {
               const canvas = await html2canvas(shareRef.current, {
                  useCORS: true,
                  scale: 1,
                  backgroundColor: null,
               });

               const isMobile = /Android|iPhone|iPad|iPod/i.test(
                  navigator.userAgent,
               );

               if (isMobile && navigator.canShare && navigator.share) {
                  canvas.toBlob(async (blob) => {
                     if (!blob) return;
                     const file = new File(
                        [blob],
                        `review-${movie.tmdb_id}.png`,
                        { type: "image/png" },
                     );
                     if (navigator.canShare({ files: [file] })) {
                        try {
                           await navigator.share({
                              files: [file],
                              title: `Review de ${movie.title}`,
                           });
                        } catch (err) {
                           console.log(
                              "Compartilhamento cancelado no mobile",
                              err,
                           );
                        }
                     }
                  }, "image/png");
               } else {
                  const image = canvas.toDataURL("image/png");
                  const link = document.createElement("a");
                  link.href = image;
                  link.download = `review-${movie.title}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
               }
            } catch (error) {
               console.error("Erro ao gerar imagem", error);
               alert("Erro ao criar a imagem.");
            } finally {
               setIsSharing(false);
               setSharingMovie(null);
            }
         }
      }, 1000);
   }, []);

   return { shareRef, sharingMovie, isSharing, handleShare };
}
