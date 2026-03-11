import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { toast } from "react-hot-toast";
import type { MovieData } from "@/types";

export function useShare() {
   const shareRef = useRef<HTMLDivElement>(null);
   const [sharingMovie, setSharingMovie] = useState<MovieData | null>(null);
   const [isSharing, setIsSharing] = useState(false);

   // ─── COMPARTILHAR COMO IMAGEM (Antigo handleShare) ───
   const handleShareImage = useCallback((movie: MovieData) => {
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

                  const base64Data = canvas.toDataURL("image/png");

                  if (Capacitor.isNativePlatform()) {
                     const base64String = base64Data.split(",")[1];
                     const fileName = `review-${movie.tmdb_id}-${Date.now()}.png`;
                     const savedFile = await Filesystem.writeFile({
                        path: fileName,
                        data: base64String,
                        directory: Directory.Cache,
                     });

                     await Share.share({
                        title: `Review de ${movie.title}`,
                        text: `Confira a minha avaliação de ${movie.title} no JJ Reviews!`,
                        url: savedFile.uri,
                        dialogTitle: 'Partilhar Review',
                     });
                  } else {
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
                  toast.error("Erro ao criar a imagem.");
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

   // ───  COMPARTILHAR COMO LINK (NOVO) ───
   const handleShareLink = useCallback(async (movie: MovieData) => {
      // Força a URL base da Vercel, mas mantém o caminho atual
      const baseUrl = "https://jj-reviews.vercel.app";
      const currentPath = window.location.pathname; // Ex: /perfil/usuario ou /
      
      const targetId = movie.tmdb_id || movie.id; 
      
      const shareUrl = `${baseUrl}${currentPath}?movie=${targetId}`;
      
      const title = `Review de ${movie.title}`;
      const text = `Confira a minha avaliação de ${movie.title} no JJ Reviews!`;

      if (Capacitor.isNativePlatform()) {
         // Abre a gaveta nativa do Android/iOS
         await Share.share({
            title,
            text,
            url: shareUrl,
            dialogTitle: 'Partilhar Review',
         });
      } else {
         if (navigator.share) {
            // Abre a gaveta nativa de compartilhamento em navegadores compatíveis
            try {
               await navigator.share({ title, text, url: shareUrl });
            } catch (err) {
               console.log("Partilha de link cancelada", err);
            }
         } else {
            // Fallback para PC: Copia para a área de transferência
            navigator.clipboard.writeText(shareUrl);
            toast.success("Link copiado para a área de transferência!");
         }
      }
   }, []);

   return { shareRef, sharingMovie, isSharing, handleShareImage, handleShareLink };
}