import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { MovieData } from "@/types";
import { useAuth } from "@/features/auth";
import { buildShareUrl, buildShareContent, buildImageFileName } from "../logic/shareOperations";

export function useShare() {
   const { username } = useAuth(); 
   const shareRef = useRef<HTMLDivElement>(null);
   const [sharingMovie, setSharingMovie] = useState<MovieData | null>(null);
   const [isSharing, setIsSharing] = useState(false);

   // ─── COMPARTILHAR COMO IMAGEM ───
   const handleShareImage = useCallback((movie: MovieData) => {
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
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
                  const { title, text } = buildShareContent(movie.title);
                  const fileName = buildImageFileName(movie.tmdb_id || movie.id, Date.now());

                  if (Capacitor.isNativePlatform()) {
                     const base64String = base64Data.split(",")[1];
                     
                     const savedFile = await Filesystem.writeFile({
                        path: fileName,
                        data: base64String,
                        directory: Directory.Cache,
                     });

                     await Share.share({
                        title,
                        text,
                        url: savedFile.uri,
                        dialogTitle: 'Compartilhar Review',
                     });
                  } else {
                     const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                     if (isMobile && navigator.canShare && navigator.share) {
                        canvas.toBlob(async (blob) => {
                           if (!blob) return;
                           const file = new File([blob], fileName, { type: "image/png" });
                           if (navigator.canShare({ files: [file] })) {
                              try {
                                 await navigator.share({ files: [file], title });
                              } catch (err) {
                                 console.log("Compartilhamento cancelado", err);
                              }
                           }
                        }, "image/png");
                     } else {
                        const link = document.createElement("a");
                        link.href = base64Data;
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                     }
                  }
                  
                  resolve({ success: true });
               } catch (error) {
                  console.error("Erro ao gerar imagem", error);
                  resolve({ success: false, error: "Erro ao criar a imagem." });
               } finally {
                  setIsSharing(false);
                  setSharingMovie(null);
               }
            } else {
               setIsSharing(false);
               setSharingMovie(null);
               resolve({ success: false, error: "Referência da imagem não encontrada." });
            }
         }, 300);
      });
   }, []);

   // ─── COMPARTILHAR COMO LINK  ───
   const handleShareLink = useCallback(async (movie: MovieData) => {
      const shareUrl = buildShareUrl(movie, window.location.pathname, username);
      const { title, text } = buildShareContent(movie.title);

      if (Capacitor.isNativePlatform()) {
         try {
            await Share.share({ title, text, url: shareUrl, dialogTitle: 'Compartilhar Review' });
            return { success: true, method: 'native' };
         } catch (err) {
            return { success: false, error: "Erro ao abrir compartilhamento nativo." + err};
         }
      } else {
         if (navigator.share) {
            try {
               await navigator.share({ title, text, url: shareUrl });
               return { success: true, method: 'web-share' };
            } catch (err) {
               console.log("Compartilhamento de link cancelado", err);
               return { success: false, cancelled: true };
            }
         } else {
            try {
               await navigator.clipboard.writeText(shareUrl);
               return { success: true, method: 'clipboard' };
            } catch (err) {
               return { success: false, error: "Erro ao copiar o link." + err};
            }
         }
      }
   }, [username]);

   return { shareRef, sharingMovie, isSharing, handleShareImage, handleShareLink };
}