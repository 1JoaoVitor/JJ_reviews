import { useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import type { MovieData, CustomList } from "@/types";

interface UseAppNavigationProps {
   movies: MovieData[];
   lists: CustomList[];
   listsLoading: boolean;
   openMovie: (movie: MovieData) => void;
   closeMovie: () => void;
   setSelectedList: (list: CustomList) => void;
}

export function useAppNavigation({ 
   movies, lists, listsLoading, openMovie, closeMovie, setSelectedList 
}: UseAppNavigationProps) {
   
   const [searchParams, setSearchParams] = useSearchParams();
   
   const movieIdInUrl = searchParams.get("movie");
   const listIdInUrl = searchParams.get("listId");
   const prevUrlMovieId = useRef<string | null>(null);

   // ─── BOTÃO NATIVO DO ANDROID ───
   useEffect(() => {
      let backButtonHandle: PluginListenerHandle | null = null;
      const setupCapacitorBackButton = async () => {
         backButtonHandle = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) window.history.back(); 
            else CapacitorApp.exitApp(); 
         });
      };
      setupCapacitorBackButton();
      return () => { if (backButtonHandle) backButtonHandle.remove(); };
   }, []);

   // ─── DEEP LINKS ───
   useEffect(() => {
      let appUrlOpenHandle: PluginListenerHandle | null = null;
      const setupDeepLinks = async () => {
         if (!Capacitor.isNativePlatform()) return;
         appUrlOpenHandle = await CapacitorApp.addListener('appUrlOpen', (event) => {
            const url = new URL(event.url);
            const movieIdFromDeepLink = url.searchParams.get("movie");
            const listIdFromDeepLink = url.searchParams.get("listId") || url.searchParams.get("list");
            if (movieIdFromDeepLink) {
               setSearchParams(prev => {
                  prev.set("movie", movieIdFromDeepLink);
                  return prev;
               }, { replace: true });
            } else if (listIdFromDeepLink) {
               setSearchParams(prev => {
                  prev.set("aba", "lists");
                  prev.set("listId", listIdFromDeepLink);
                  return prev;
               }, { replace: true });
            }
         });
      };
      setupDeepLinks();
      return () => { if (appUrlOpenHandle) appUrlOpenHandle.remove(); };
   }, [setSearchParams]);

   // ─── ABRIR LISTAS PELA URL ───
   useEffect(() => {
      if (listIdInUrl && !listsLoading && lists.length > 0) {
         const listToOpen = lists.find(l => l.id === listIdInUrl);
         if (listToOpen) setSelectedList(listToOpen);
      }
   }, [listIdInUrl, lists, listsLoading, setSelectedList]);

   // ─── ESCUTA DA URL PARA O MODAL DE FILMES (F5 / Voltar) ───
   useEffect(() => {
      if (movieIdInUrl === prevUrlMovieId.current) return;

      if (!movieIdInUrl) {
         closeMovie();
         prevUrlMovieId.current = null;
      } else {
         if (movies.length === 0) return;

         const movieToOpen = movies.find(m => 
            (m.id && m.id.toString() === movieIdInUrl) || 
            (m.tmdb_id && m.tmdb_id.toString() === movieIdInUrl)
         );
         
         if (movieToOpen) {
            openMovie(movieToOpen);
            prevUrlMovieId.current = movieIdInUrl;
         } else {
            closeMovie();
            setSearchParams(prev => {
               prev.delete("movie");
               return prev;
            }, { replace: true });
            prevUrlMovieId.current = null;
         }
      }
   }, [movieIdInUrl, movies, openMovie, closeMovie, setSearchParams]);

   // ─── Helper para abrir o modal ───
   const handleOpenModal = useCallback((movie: MovieData) => {
      const targetId = movie.tmdb_id || movie.id;
      if (!targetId) return;

      openMovie(movie);
      
      prevUrlMovieId.current = targetId.toString();
      
      setSearchParams(prev => {
         prev.set("movie", targetId.toString());
         return prev;
      }); 
   }, [openMovie, setSearchParams]);

   return { handleOpenModal };
}