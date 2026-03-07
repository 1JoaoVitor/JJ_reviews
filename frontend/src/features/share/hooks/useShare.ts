import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import type { MovieData } from "@/types";

export function useShare() {
   const shareRef = useRef<HTMLDivElement>(null);
   const [sharingMovie, setSharingMovie] = useState<MovieData | null>(null);
   const [isSharing, setIsSharing] = useState(false);

   const handleShare = useCallback((movie: MovieData) => {
      // Cria uma "Promessa" para o Modal esperar
      return new Promise<void>((resolve) => {
         setSharingMovie(movie);
         setIsSharing(true);

         // Dam 300ms para o React terminar de desenhar o cartão com as novas opções
         setTimeout(async () => {
            if (shareRef.current) {
               try {
                  const canvas = await html2canvas(shareRef.current, {
                     useCORS: true,
                     scale: 1,
                     backgroundColor: null,
                  });

                  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

                  if (isMobile && navigator.canShare && navigator.share) {
                     canvas.toBlob(async (blob) => {
                        if (!blob) return;
                        const file = new File([blob], `review-${movie.tmdb_id}.png`, { type: "image/png" });
                        if (navigator.canShare({ files: [file] })) {
                           try {
                              await navigator.share({
                                 files: [file],
                                 title: `Review de ${movie.title}`,
                              });
                           } catch (err) {
                              console.log("Compartilhamento cancelado no mobile", err);
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
                  // Independentemente de dar certo ou errado, reseta e "Avisas" que acabou
                  setIsSharing(false);
                  setSharingMovie(null);
                  resolve(); 
               }
            } else {
               // Se o ref falhar, não ficam presos no loading infinito
               setIsSharing(false);
               setSharingMovie(null);
               resolve();
            }
         }, 300);
      });
   }, []);

   return { shareRef, sharingMovie, isSharing, handleShare };
}