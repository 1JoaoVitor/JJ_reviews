import { useState } from "react";
import type { MovieData, CustomList } from "@/types";
import { useSearchParams } from "react-router-dom";

export function useAppModals() {
   const [searchParams, setSearchParams] = useSearchParams();

   // ─── Estados de Visibilidade ───
   const [showMovieModal, setShowMovieModal] = useState(false);
   const [showAddModal, setShowAddModal] = useState(false);
   const [showShareModal, setShowShareModal] = useState(false);
   const [showLoginModal, setShowLoginModal] = useState(false);
   const [showProfileModal, setShowProfileModal] = useState(false);
   const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
   const [showFriendsModal, setShowFriendsModal] = useState(false);
   const [showRoulette, setShowRoulette] = useState(false);
   const [showCreateListModal, setShowCreateListModal] = useState(false);

   // ─── Estados de Dados Selecionados ───
   const [selectedMovie, setSelectedMovie] = useState<MovieData | null>(null);
   const [movieToShare, setMovieToShare] = useState<MovieData | null>(null);
   const [movieToEdit, setMovieToEdit] = useState<MovieData | null>(null);
   const [selectedList, setSelectedList] = useState<CustomList | null>(null);
   const [preselectedListId, setPreselectedListId] = useState<string>("");

   // ─── Lógica da Batalha  ───
   const isBattleMode = searchParams.get("modo") === "batalha";

   const setIsBattleMode = (active: boolean) => {
      if (active) {
         setSearchParams(prev => {
            prev.set("modo", "batalha");
            return prev;
         });
      } else {
         const newParams = new URLSearchParams(searchParams);
         newParams.delete("modo");
         setSearchParams(newParams, { replace: true });
      }
   };

   // ─── Helpers de Abertura/Fechamento ───
   const openMovie = (movie: MovieData) => {
      setSelectedMovie(movie);
      setShowMovieModal(true);
   };

   const closeMovie = () => {
      setShowMovieModal(false);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("movie");
      setSearchParams(newParams, { replace: true });
   };

   const openAddMovie = (movie?: MovieData | null, listId?: string) => {
      setMovieToEdit(movie || null);
      setPreselectedListId(listId || "");
      setShowAddModal(true);
   };

   const openShare = (movie: MovieData) => {
      setMovieToShare(movie);
      setShowShareModal(true);
   };

   return {
      // Visibilidade
      showMovieModal, setShowMovieModal,
      showAddModal, setShowAddModal,
      showShareModal, setShowShareModal,
      showLoginModal, setShowLoginModal,
      showProfileModal, setShowProfileModal,
      showLogoutConfirm, setShowLogoutConfirm,
      showFriendsModal, setShowFriendsModal,
      showRoulette, setShowRoulette,
      showCreateListModal, setShowCreateListModal,
      
      // Dados
      selectedMovie, setSelectedMovie,
      movieToShare, setMovieToShare,
      movieToEdit, setMovieToEdit,
      selectedList, setSelectedList,
      preselectedListId, setPreselectedListId,

      // Battle & Modo
      isBattleMode, setIsBattleMode,

      // Actions
      openMovie, closeMovie, openAddMovie, openShare
   };
}