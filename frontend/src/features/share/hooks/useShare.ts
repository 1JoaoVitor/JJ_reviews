import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { MovieData } from "@/types";

export function useShare() {
   const shareRef = useRef<HTMLDivElement>(null);
   const [sharingMovie, setSharingMovie] = useState<MovieData | null>(null);
   const [isSharing, setIsSharing] = useState(false);

   const handleShare = useCallback((movie: MovieData) => {
      return new Promise<void>((resolve) => {
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

                  // Converte o canvas para uma string de imagem (base64)
                  const base64Data = canvas.toDataURL("image/png");

                  // ─── LÓGICA NATIVA MOBILE ───
                  if (Capacitor.isNativePlatform()) {
                     const base64String = base64Data.split(",")[1];
                     const fileName = `review-${movie.tmdb_id}-${Date.now()}.png`;
                     const savedFile = await Filesystem.writeFile({
                        path: fileName,
                        data: base64String,
                        directory: Directory.Cache,
                     });

                     // Abre a aba de compartilhar nativa (WhatsApp, Instagram, etc)
                     await Share.share({
                        title: `Review de ${movie.title}`,
                        text: `Confere a minha avaliação de ${movie.title} no JJ Reviews!`,
                        url: savedFile.uri,
                        dialogTitle: 'Partilhar Review',
                     });
                  } 
                  
                  // ─── LÓGICA WEB (COMPUTADOR OU NAVEGADOR) ───
                  else {
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
                                 console.log("Partilha cancelada", err);
                              }
                           }
                        }, "image/png");
                     } else {
                        // Download tradicional no PC
                        const link = document.createElement("a");
                        link.href = base64Data;
                        link.download = `review-${movie.title}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                     }
                  }
               } catch (error) {
                  console.error("Erro ao gerar imagem", error);
                  alert("Erro ao criar a imagem.");
               } finally {
                  setIsSharing(false);
                  setSharingMovie(null);
                  resolve();
               }
            } else {
               setIsSharing(false);
               setSharingMovie(null);
               resolve();
            }
         }, 300);
      });
   }, []);

   return { shareRef, sharingMovie, isSharing, handleShare };
}